"""Client management business logic."""
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.core.logging import get_logger
from app.models.client import Client
from app.repositories.client_repository import ClientRepository
from app.schemas.client import ClientCreate, ClientUpdate

logger = get_logger(__name__)


class ClientService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.clients = ClientRepository(db)

    def get(self, client_id: int) -> Client:
        client = self.clients.get_by_id(client_id)
        if client is None:
            raise NotFoundError("Client not found")
        return client

    def list(self, *, skip: int = 0, limit: int = 100) -> list[Client]:
        return self.clients.list(skip=skip, limit=limit)

    def count(self) -> int:
        return self.clients.count()

    def create(self, data: ClientCreate) -> Client:
        if data.email and self.clients.get_by_email(data.email):
            raise ConflictError("A client with this email already exists")

        client = Client(**data.model_dump())
        self.clients.add(client)
        self.db.commit()
        self.db.refresh(client)
        logger.info("Created client id=%s", client.id)
        return client

    def update(self, client_id: int, data: ClientUpdate) -> Client:
        client = self.get(client_id)
        payload = data.model_dump(exclude_unset=True)

        new_email = payload.get("email")
        if new_email and new_email != client.email:
            existing = self.clients.get_by_email(new_email)
            if existing is not None:
                raise ConflictError("A client with this email already exists")

        for field, value in payload.items():
            setattr(client, field, value)

        self.db.commit()
        self.db.refresh(client)
        logger.info("Updated client id=%s", client.id)
        return client

    def delete(self, client_id: int) -> None:
        client = self.get(client_id)
        self.clients.delete(client)
        self.db.commit()
        logger.info("Deleted client id=%s", client_id)

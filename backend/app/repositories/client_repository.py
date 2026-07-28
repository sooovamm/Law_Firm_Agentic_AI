"""Client repository."""
from sqlalchemy import select

from app.models.client import Client
from app.repositories.base import BaseRepository


class ClientRepository(BaseRepository[Client]):
    model = Client

    def get_by_email(self, email: str) -> Client | None:
        stmt = select(Client).where(Client.email == email)
        return self.db.execute(stmt).scalar_one_or_none()

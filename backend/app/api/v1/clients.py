"""Client management endpoints."""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_roles
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate
from app.schemas.common import Message
from app.services.client_service import ClientService

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientRead])
def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ClientRead]:
    clients = ClientService(db).list(skip=skip, limit=limit)
    return [ClientRead.model_validate(c) for c in clients]


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> ClientRead:
    return ClientRead.model_validate(ClientService(db).create(payload))


@router.get("/{client_id}", response_model=ClientRead)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ClientRead:
    return ClientRead.model_validate(ClientService(db).get(client_id))


@router.patch("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> ClientRead:
    return ClientRead.model_validate(ClientService(db).update(client_id, payload))


@router.delete("/{client_id}", response_model=Message)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER)),
) -> Message:
    ClientService(db).delete(client_id)
    return Message(detail="Client deleted")

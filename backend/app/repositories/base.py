"""Generic repository providing common persistence operations."""
from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Encapsulates database access for a single model.

    Repositories own the session but do NOT own transaction boundaries beyond
    flush; the service layer decides when to commit.
    """

    model: type[ModelType]

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, entity_id: int) -> ModelType | None:
        return self.db.get(self.model, entity_id)

    def list(self, *, skip: int = 0, limit: int = 100) -> list[ModelType]:
        stmt = select(self.model).offset(skip).limit(limit).order_by(self.model.id)
        return list(self.db.execute(stmt).scalars().all())

    def count(self) -> int:
        stmt = select(func.count()).select_from(self.model)
        return self.db.execute(stmt).scalar_one()

    def add(self, entity: ModelType) -> ModelType:
        self.db.add(entity)
        self.db.flush()
        self.db.refresh(entity)
        return entity

    def delete(self, entity: ModelType) -> None:
        self.db.delete(entity)
        self.db.flush()

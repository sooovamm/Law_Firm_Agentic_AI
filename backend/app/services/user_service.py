"""User management business logic."""
from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.core.exceptions import ConflictError, NotFoundError
from app.core.logging import get_logger
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate

logger = get_logger(__name__)


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def get(self, user_id: int) -> User:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found")
        return user

    def list(self, *, skip: int = 0, limit: int = 100) -> list[User]:
        return self.users.list(skip=skip, limit=limit)

    def count(self) -> int:
        return self.users.count()

    def create(self, data: UserCreate) -> User:
        if self.users.email_exists(data.email):
            raise ConflictError("A user with this email already exists")

        user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            role=data.role,
        )
        self.users.add(user)
        self.db.commit()
        self.db.refresh(user)
        logger.info("Created user id=%s", user.id)
        return user

    def update(self, user_id: int, data: UserUpdate) -> User:
        user = self.get(user_id)
        payload = data.model_dump(exclude_unset=True)

        if "password" in payload and payload["password"] is not None:
            user.hashed_password = hash_password(payload.pop("password"))
        else:
            payload.pop("password", None)

        for field, value in payload.items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        logger.info("Updated user id=%s", user.id)
        return user

    def delete(self, user_id: int) -> None:
        user = self.get(user_id)
        self.users.delete(user)
        self.db.commit()
        logger.info("Deleted user id=%s", user_id)

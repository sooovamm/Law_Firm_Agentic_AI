"""Authentication business logic."""
from sqlalchemy.orm import Session

from app.auth.jwt import (
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.auth.security import hash_password, verify_password
from app.core.exceptions import AuthenticationError, ConflictError, NotFoundError
from app.core.logging import get_logger
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPair

logger = get_logger(__name__)


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def register(self, data: RegisterRequest) -> tuple[User, TokenPair]:
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
        logger.info("Registered new user id=%s role=%s", user.id, user.role.value)

        return user, self._issue_tokens(user)

    def login(self, data: LoginRequest) -> tuple[User, TokenPair]:
        user = self.users.get_by_email(data.email)
        if user is None or not verify_password(data.password, user.hashed_password):
            # Same message for both cases to avoid user enumeration.
            raise AuthenticationError("Incorrect email or password")
        if not user.is_active:
            raise AuthenticationError("User account is inactive")

        logger.info("User logged in id=%s", user.id)
        return user, self._issue_tokens(user)

    def refresh(self, refresh_token: str) -> TokenPair:
        payload = decode_token(refresh_token, expected_type=REFRESH_TOKEN_TYPE)
        user = self.users.get_by_id(int(payload["sub"]))
        if user is None:
            raise NotFoundError("User not found")
        if not user.is_active:
            raise AuthenticationError("User account is inactive")

        logger.info("Refreshed tokens for user id=%s", user.id)
        return self._issue_tokens(user)

    def _issue_tokens(self, user: User) -> TokenPair:
        subject = str(user.id)
        role = user.role.value
        return TokenPair(
            access_token=create_access_token(subject, role),
            refresh_token=create_refresh_token(subject, role),
        )

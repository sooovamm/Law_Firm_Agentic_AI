"""FastAPI auth dependencies: resolve current user and enforce roles."""
from collections.abc import Callable

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.jwt import ACCESS_TOKEN_TYPE, decode_token
from app.core.exceptions import AuthenticationError, PermissionDeniedError
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise AuthenticationError("Not authenticated")

    payload = decode_token(credentials.credentials, expected_type=ACCESS_TOKEN_TYPE)
    user_id = int(payload["sub"])

    user = UserRepository(db).get_by_id(user_id)
    if user is None:
        raise AuthenticationError("User no longer exists")
    if not user.is_active:
        raise AuthenticationError("User account is inactive")

    return user


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    """Dependency factory that restricts access to the given roles."""
    allowed = set(roles)

    def _guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise PermissionDeniedError(
                f"Requires one of roles: {', '.join(r.value for r in allowed)}"
            )
        return current_user

    return _guard

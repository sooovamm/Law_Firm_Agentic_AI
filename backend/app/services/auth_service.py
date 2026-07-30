"""Authentication business logic."""
import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.auth.jwt import (
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.auth.security import hash_password, verify_password
from app.core.config import settings
from app.core.exceptions import AuthenticationError, ConflictError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.core.mailer import Mailer
from app.models.email_otp import EmailOtp
from app.models.user import User
from app.repositories.email_otp_repository import EmailOtpRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, RegisterVerifyRequest, TokenPair

logger = get_logger(__name__)


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.otps = EmailOtpRepository(db)

    def request_registration_otp(self, data: RegisterRequest, mailer: Mailer) -> int:
        """Email a 4-digit code to verify ownership of the address before account creation."""
        if self.users.email_exists(data.email):
            raise ConflictError("A user with this email already exists")

        code = f"{secrets.randbelow(10000):04d}"
        self.otps.invalidate_active_for_email(data.email)
        otp = EmailOtp(
            email=data.email,
            code_hash=self._hash_otp(data.email, code),
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.otp_expire_minutes),
        )
        self.otps.add(otp)
        self.db.commit()

        mailer.send(
            to=data.email,
            subject="Your Legal CMS verification code",
            body=(
                f"Your verification code is: {code}\n\n"
                f"This code expires in {settings.otp_expire_minutes} minutes."
            ),
        )
        logger.info("Sent registration OTP to email=%s", data.email)
        return settings.otp_expire_minutes

    def verify_registration_otp(self, data: RegisterVerifyRequest) -> tuple[User, TokenPair]:
        if self.users.email_exists(data.email):
            raise ConflictError("A user with this email already exists")

        otp = self.otps.get_active_for_email(data.email)
        if otp is None:
            raise ValidationError("Verification code expired or not requested. Request a new one.")
        if otp.attempts >= settings.otp_max_attempts:
            otp.consumed = True
            self.db.commit()
            raise ValidationError("Too many incorrect attempts. Request a new code.")
        if otp.code_hash != self._hash_otp(data.email, data.otp_code):
            otp.attempts += 1
            self.db.commit()
            raise ValidationError("Incorrect verification code")

        otp.consumed = True
        user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            role=data.role,
        )
        self.users.add(user)
        self.db.commit()
        self.db.refresh(user)
        logger.info("Registered new user id=%s role=%s (email verified)", user.id, user.role.value)

        return user, self._issue_tokens(user)

    @staticmethod
    def _hash_otp(email: str, code: str) -> str:
        return hashlib.sha256(f"{email}:{code}".encode()).hexdigest()

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

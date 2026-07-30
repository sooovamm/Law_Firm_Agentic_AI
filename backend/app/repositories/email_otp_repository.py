"""Repository for registration email OTPs."""
from datetime import UTC, datetime

from sqlalchemy import select, update

from app.models.email_otp import EmailOtp
from app.repositories.base import BaseRepository


class EmailOtpRepository(BaseRepository[EmailOtp]):
    model = EmailOtp

    def invalidate_active_for_email(self, email: str) -> None:
        stmt = (
            update(EmailOtp)
            .where(EmailOtp.email == email, EmailOtp.consumed.is_(False))
            .values(consumed=True)
        )
        self.db.execute(stmt)
        self.db.flush()

    def get_active_for_email(self, email: str) -> EmailOtp | None:
        stmt = (
            select(EmailOtp)
            .where(
                EmailOtp.email == email,
                EmailOtp.consumed.is_(False),
                EmailOtp.expires_at > datetime.now(UTC),
            )
            .order_by(EmailOtp.id.desc())
        )
        return self.db.execute(stmt).scalars().first()

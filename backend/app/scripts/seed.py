"""Seed an initial admin user. Run: uv run python -m app.scripts.seed"""
from app.auth.security import hash_password
from app.core.logging import configure_logging, get_logger
from app.database.session import SessionLocal
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository

configure_logging()
logger = get_logger(__name__)

DEFAULT_ADMIN_EMAIL = "admin@legalcms.local"
DEFAULT_ADMIN_PASSWORD = "ChangeMe123!"  # noqa: S105 - dev seed only


def seed_admin() -> None:
    db = SessionLocal()
    try:
        repo = UserRepository(db)
        if repo.email_exists(DEFAULT_ADMIN_EMAIL):
            logger.info("Admin already exists, skipping seed")
            return

        admin = User(
            email=DEFAULT_ADMIN_EMAIL,
            full_name="System Admin",
            hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
        )
        repo.add(admin)
        db.commit()
        logger.info("Seeded admin user: %s / %s", DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD)
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()

"""Data access for emails, including inbox listing and search."""
from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.email_agent.enums import EmailStatus, EmailUrgency
from app.email_agent.model import Email


class EmailRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, email: Email) -> Email:
        self.db.add(email)
        self.db.flush()
        self.db.refresh(email)
        return email

    def get(self, email_id: int) -> Email | None:
        return self.db.get(Email, email_id)

    def get_with_relations(self, email_id: int) -> Email | None:
        stmt = (
            select(Email)
            .where(Email.id == email_id)
            .options(joinedload(Email.case), joinedload(Email.client))
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def get_by_external_id(self, external_id: str) -> Email | None:
        stmt = select(Email).where(Email.external_id == external_id)
        return self.db.execute(stmt).scalars().first()

    def list(
        self,
        *,
        q: str | None = None,
        status: EmailStatus | None = None,
        urgency: EmailUrgency | None = None,
        case_id: int | None = None,
        client_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Email]:
        stmt = select(Email).options(
            joinedload(Email.case), joinedload(Email.client)
        )
        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                or_(
                    Email.subject.ilike(like),
                    Email.sender.ilike(like),
                    Email.body.ilike(like),
                    Email.summary.ilike(like),
                )
            )
        if status is not None:
            stmt = stmt.where(Email.status == status)
        if urgency is not None:
            stmt = stmt.where(Email.urgency == urgency)
        if case_id is not None:
            stmt = stmt.where(Email.case_id == case_id)
        if client_id is not None:
            stmt = stmt.where(Email.client_id == client_id)

        stmt = stmt.order_by(Email.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).unique().scalars().all())

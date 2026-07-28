"""Email ORM model.

Stores ingested emails plus the email agent's derived outputs (summary,
urgency, extracted tasks/deadlines, and a draft reply). Extracted collections
are stored as JSON since they are read/written as whole documents and never
queried field-by-field.
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.email_agent.enums import EmailProvider, EmailStatus, EmailUrgency

if TYPE_CHECKING:
    from app.models.case import Case
    from app.models.client import Client


class Email(Base, TimestampMixin):
    __tablename__ = "emails"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Core fields (required by the sprint spec).
    sender: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    receiver: Mapped[str] = mapped_column(String(320), nullable=False)
    subject: Mapped[str] = mapped_column(String(998), nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    case_id: Mapped[int | None] = mapped_column(
        ForeignKey("cases.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Provider metadata.
    provider: Mapped[EmailProvider] = mapped_column(
        Enum(EmailProvider, name="email_provider", values_callable=lambda e: [m.value for m in e]), nullable=False
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    received_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Agent-derived fields.
    status: Mapped[EmailStatus] = mapped_column(
        Enum(EmailStatus, name="email_status", values_callable=lambda e: [m.value for m in e]),
        default=EmailStatus.RECEIVED,
        nullable=False,
        index=True,
    )
    urgency: Mapped[EmailUrgency | None] = mapped_column(
        Enum(EmailUrgency, name="email_urgency", values_callable=lambda e: [m.value for m in e]), nullable=True, index=True
    )
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tasks: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    deadlines: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    draft_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    case: Mapped["Case | None"] = relationship()
    client: Mapped["Client | None"] = relationship()

    def __repr__(self) -> str:
        return f"<Email id={self.id} from={self.sender} status={self.status}>"

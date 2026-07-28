"""Case notes and timeline events."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.enums import CaseEventType

if TYPE_CHECKING:
    from app.models.case import Case
    from app.models.user import User


class CaseNote(Base, TimestampMixin):
    __tablename__ = "case_notes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    case_id: Mapped[int] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    case: Mapped["Case"] = relationship(back_populates="notes")
    author: Mapped["User | None"] = relationship()

    def __repr__(self) -> str:
        return f"<CaseNote id={self.id} case={self.case_id}>"


class CaseEvent(Base, TimestampMixin):
    __tablename__ = "case_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    case_id: Mapped[int] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[CaseEventType] = mapped_column(
        Enum(CaseEventType, name="case_event_type", values_callable=lambda e: [m.value for m in e]), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)

    case: Mapped["Case"] = relationship(back_populates="events")

    def __repr__(self) -> str:
        return f"<CaseEvent id={self.id} type={self.event_type} at={self.scheduled_at}>"

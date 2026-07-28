"""Consultation ORM model."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.scheduling.enums import DEFAULT_DURATION_MINUTES, ConsultationStatus

if TYPE_CHECKING:
    from app.models.case import Case
    from app.models.client import Client
    from app.models.user import User


class Consultation(Base, TimestampMixin):
    __tablename__ = "consultations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    case_id: Mapped[int | None] = mapped_column(
        ForeignKey("cases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    lawyer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True
    )

    scheduled_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    duration_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=DEFAULT_DURATION_MINUTES
    )
    status: Mapped[ConsultationStatus] = mapped_column(
        Enum(ConsultationStatus, name="consultation_status_v2", values_callable=lambda e: [m.value for m in e]),
        default=ConsultationStatus.PENDING,
        nullable=False,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Who requested/created the booking (may differ from the lawyer).
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    case: Mapped["Case | None"] = relationship()
    lawyer: Mapped["User"] = relationship(foreign_keys=[lawyer_id])
    client: Mapped["Client | None"] = relationship()

    def __repr__(self) -> str:
        return (
            f"<Consultation id={self.id} lawyer={self.lawyer_id} "
            f"at={self.scheduled_time} status={self.status}>"
        )

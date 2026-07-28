"""Deadline ORM model.

A `dedup_key` uniquely identifies a deadline within a case so the extraction
pipeline never creates the same deadline twice (e.g. when the same date appears
in several documents or emails). It is a deterministic hash of case + type +
date + normalized title, enforced by a unique constraint.
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.deadlines.enums import DeadlinePriority, DeadlineSource, DeadlineType

if TYPE_CHECKING:
    from app.models.case import Case


class Deadline(Base, TimestampMixin):
    __tablename__ = "deadlines"
    __table_args__ = (
        UniqueConstraint("case_id", "dedup_key", name="uq_deadline_case_dedup"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    case_id: Mapped[int | None] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    due_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )
    priority: Mapped[DeadlinePriority] = mapped_column(
        Enum(DeadlinePriority, name="deadline_priority", values_callable=lambda e: [m.value for m in e]),
        default=DeadlinePriority.MEDIUM,
        nullable=False,
        index=True,
    )

    deadline_type: Mapped[DeadlineType] = mapped_column(
        Enum(DeadlineType, name="deadline_type", values_callable=lambda e: [m.value for m in e]),
        default=DeadlineType.OTHER,
        nullable=False,
    )
    source: Mapped[DeadlineSource] = mapped_column(
        Enum(DeadlineSource, name="deadline_source", values_callable=lambda e: [m.value for m in e]),
        default=DeadlineSource.MANUAL,
        nullable=False,
    )
    source_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    dedup_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    # Whether a reminder has already been dispatched (avoids repeat sends).
    reminder_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    case: Mapped["Case | None"] = relationship()

    def __repr__(self) -> str:
        return f"<Deadline id={self.id} due={self.due_date} type={self.deadline_type}>"

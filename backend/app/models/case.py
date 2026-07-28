"""Case ORM model."""
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.enums import CaseStatus, CaseUrgency, PracticeArea

if TYPE_CHECKING:
    from app.documents.model import Document
    from app.models.case_activity import CaseEvent, CaseNote
    from app.models.client import Client
    from app.models.user import User


class Case(Base, TimestampMixin):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    practice_area: Mapped[PracticeArea] = mapped_column(
        Enum(PracticeArea, name="practice_area", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    status: Mapped[CaseStatus] = mapped_column(
        Enum(CaseStatus, name="case_status", values_callable=lambda e: [m.value for m in e]),
        default=CaseStatus.OPEN,
        nullable=False,
        index=True,
    )
    urgency: Mapped[CaseUrgency] = mapped_column(
        Enum(CaseUrgency, name="case_urgency", values_callable=lambda e: [m.value for m in e]),
        default=CaseUrgency.MEDIUM,
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # AI-maintained rolling summary, updated as documents are processed.
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_lawyer_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    client: Mapped["Client"] = relationship(back_populates="cases")
    assigned_lawyer: Mapped["User | None"] = relationship(
        back_populates="assigned_cases",
        foreign_keys=[assigned_lawyer_id],
    )
    documents: Mapped[list["Document"]] = relationship(
        back_populates="case",
        passive_deletes=True,
    )
    notes: Mapped[list["CaseNote"]] = relationship(
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="CaseNote.created_at.desc()",
    )
    events: Mapped[list["CaseEvent"]] = relationship(
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="CaseEvent.scheduled_at",
    )

    def __repr__(self) -> str:
        return f"<Case id={self.id} title={self.title} status={self.status}>"

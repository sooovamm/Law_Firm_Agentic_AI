"""ORM models for the AI intake conversation domain."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.conversations.enums import (
    ConversationStatus,
    IntakePracticeArea,
    IntakeStage,
    MessageRole,
    Urgency,
)
from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.case import Case
    from app.models.user import User


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    status: Mapped[ConversationStatus] = mapped_column(
        Enum(ConversationStatus, name="conversation_status", values_callable=lambda e: [m.value for m in e]),
        default=ConversationStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    stage: Mapped[IntakeStage] = mapped_column(
        Enum(IntakeStage, name="intake_stage", values_callable=lambda e: [m.value for m in e]),
        default=IntakeStage.GREETING,
        nullable=False,
    )
    practice_area: Mapped[IntakePracticeArea | None] = mapped_column(
        Enum(IntakePracticeArea, name="intake_practice_area", values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )
    # Owning staff user (optional; intake may be anonymous/public).
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Case created at the end of a successful intake, if any.
    case_id: Mapped[int | None] = mapped_column(
        ForeignKey("cases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.id",
    )
    summary: Mapped["AISummary | None"] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        uselist=False,
    )
    created_by: Mapped["User | None"] = relationship()
    case: Mapped["Case | None"] = relationship()

    def __repr__(self) -> str:
        return f"<Conversation id={self.id} stage={self.stage} status={self.status}>"


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[MessageRole] = mapped_column(
        Enum(MessageRole, name="message_role", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")

    def __repr__(self) -> str:
        return f"<Message id={self.id} role={self.role} conv={self.conversation_id}>"


class AISummary(Base, TimestampMixin):
    __tablename__ = "ai_summaries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    practice_area: Mapped[IntakePracticeArea | None] = mapped_column(
        Enum(IntakePracticeArea, name="intake_practice_area", values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )
    urgency: Mapped[Urgency | None] = mapped_column(
        Enum(Urgency, name="urgency", values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )
    recommended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Stored as newline-joined text to avoid a JSON column dependency.
    missing_information: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    conversation: Mapped["Conversation"] = relationship(back_populates="summary")

    def __repr__(self) -> str:
        return f"<AISummary id={self.id} conv={self.conversation_id}>"

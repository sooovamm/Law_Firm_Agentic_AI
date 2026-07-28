"""Data access for conversations, messages, and summaries."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.conversations.enums import MessageRole
from app.conversations.models import AISummary, Conversation, Message


class ConversationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, created_by_id: int | None = None) -> Conversation:
        conv = Conversation(created_by_id=created_by_id)
        self.db.add(conv)
        self.db.flush()
        self.db.refresh(conv)
        return conv

    def get(self, conversation_id: int) -> Conversation | None:
        return self.db.get(Conversation, conversation_id)

    def get_with_messages(self, conversation_id: int) -> Conversation | None:
        stmt = (
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .options(
                selectinload(Conversation.messages),
                joinedload(Conversation.summary),
            )
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def list_recent(
        self, *, created_by_id: int | None = None, skip: int = 0, limit: int = 50
    ) -> list[Conversation]:
        stmt = select(Conversation).order_by(Conversation.updated_at.desc())
        if created_by_id is not None:
            stmt = stmt.where(Conversation.created_by_id == created_by_id)
        stmt = stmt.offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def messages_for(self, conversation_id: int) -> list[Message]:
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.id)
        )
        return list(self.db.execute(stmt).scalars().all())

    def add_message(self, conversation_id: int, role: MessageRole, content: str) -> Message:
        msg = Message(conversation_id=conversation_id, role=role, content=content)
        self.db.add(msg)
        self.db.flush()
        self.db.refresh(msg)
        return msg

    def upsert_summary(self, summary: AISummary) -> AISummary:
        self.db.add(summary)
        self.db.flush()
        self.db.refresh(summary)
        return summary

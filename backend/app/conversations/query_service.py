"""Read-side service for conversation history and detail."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.conversations.models import Conversation
from app.conversations.repository import ConversationRepository
from app.conversations.schemas import (
    AISummaryRead,
    ConversationDetail,
    ConversationSummaryItem,
    MessageRead,
)
from app.core.exceptions import NotFoundError


class ConversationQueryService:
    def __init__(self, db: Session) -> None:
        self.repo = ConversationRepository(db)

    def get_detail(self, conversation_id: int) -> ConversationDetail:
        conv = self.repo.get_with_messages(conversation_id)
        if conv is None:
            raise NotFoundError("Conversation not found")
        return self._to_detail(conv)

    def list_history(
        self, *, created_by_id: int | None = None, skip: int = 0, limit: int = 50
    ) -> list[ConversationSummaryItem]:
        conversations = self.repo.list_recent(
            created_by_id=created_by_id, skip=skip, limit=limit
        )
        return [ConversationSummaryItem.model_validate(c) for c in conversations]

    @staticmethod
    def _to_detail(conv: Conversation) -> ConversationDetail:
        summary_read = None
        if conv.summary is not None:
            s = conv.summary
            summary_read = AISummaryRead(
                id=s.id,
                title=s.title,
                summary=s.summary,
                client_name=s.client_name,
                practice_area=s.practice_area,
                urgency=s.urgency,
                recommended=s.recommended,
                missing_information=(
                    s.missing_information.split("\n") if s.missing_information else []
                ),
                message_count=s.message_count,
                created_at=s.created_at,
            )

        return ConversationDetail(
            id=conv.id,
            status=conv.status,
            stage=conv.stage,
            practice_area=conv.practice_area,
            case_id=conv.case_id,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            messages=[MessageRead.model_validate(m) for m in conv.messages],
            summary=summary_read,
        )

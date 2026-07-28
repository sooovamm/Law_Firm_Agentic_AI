"""Case detail service: assembles the detail page and manages notes/events."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.conversations.models import Conversation
from app.conversations.schemas import ConversationSummaryItem, MessageRead
from app.core.exceptions import NotFoundError
from app.documents.schemas import DocumentRead
from app.models.case import Case
from app.models.case_activity import CaseEvent, CaseNote
from app.models.enums import ActivityType
from app.repositories.case_repository import CaseRepository
from app.schemas.case_activity import (
    CaseEventCreate,
    CaseEventRead,
    CaseNoteCreate,
    CaseNoteRead,
    TimelineItem,
)
from app.schemas.case_detail import CaseFullDetail, LinkedConversation
from app.schemas.client import ClientRead
from app.schemas.user import UserRead
from app.services.activity_logger import log_activity


class CaseDetailService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.cases = CaseRepository(db)

    def get_full_detail(self, case_id: int) -> CaseFullDetail:
        case = self.cases.get_full(case_id)
        if case is None:
            raise NotFoundError("Case not found")

        documents = [DocumentRead.model_validate(d) for d in case.documents]
        notes = [CaseNoteRead.model_validate(n) for n in case.notes]
        events = [CaseEventRead.model_validate(e) for e in case.events]

        conversation = self._linked_conversation(case_id)
        timeline = self._build_timeline(case)

        return CaseFullDetail(
            id=case.id,
            title=case.title,
            practice_area=case.practice_area,
            status=case.status,
            urgency=case.urgency,
            description=case.description,
            ai_summary=case.ai_summary,
            created_at=case.created_at,
            updated_at=case.updated_at,
            client=ClientRead.model_validate(case.client) if case.client else None,
            assigned_lawyer=(
                UserRead.model_validate(case.assigned_lawyer)
                if case.assigned_lawyer
                else None
            ),
            documents=documents,
            notes=notes,
            events=events,
            timeline=timeline,
            conversation=conversation,
        )

    def add_note(self, case_id: int, data: CaseNoteCreate, author_id: int | None) -> CaseNoteRead:
        case = self.cases.get_by_id(case_id)
        if case is None:
            raise NotFoundError("Case not found")

        note = CaseNote(case_id=case_id, author_id=author_id, content=data.content)
        self.db.add(note)
        self.db.flush()
        log_activity(
            self.db,
            activity_type=ActivityType.NOTE_ADDED,
            description=f"Note added to case '{case.title}'",
            case_id=case_id,
            actor_id=author_id,
        )
        self.db.commit()
        self.db.refresh(note)
        return CaseNoteRead.model_validate(note)

    def add_event(self, case_id: int, data: CaseEventCreate, actor_id: int | None) -> CaseEventRead:
        case = self.cases.get_by_id(case_id)
        if case is None:
            raise NotFoundError("Case not found")

        event = CaseEvent(
            case_id=case_id,
            event_type=data.event_type,
            title=data.title,
            description=data.description,
            scheduled_at=data.scheduled_at,
            location=data.location,
        )
        self.db.add(event)
        self.db.flush()
        log_activity(
            self.db,
            activity_type=ActivityType.EVENT_SCHEDULED,
            description=f"{data.event_type.value.title()} scheduled for case '{case.title}'",
            case_id=case_id,
            actor_id=actor_id,
        )
        self.db.commit()
        self.db.refresh(event)
        return CaseEventRead.model_validate(event)

    # ---- internals -------------------------------------------------------

    def _linked_conversation(self, case_id: int) -> LinkedConversation | None:
        stmt = select(Conversation).where(Conversation.case_id == case_id)
        conv = self.db.execute(stmt).scalars().first()
        if conv is None:
            return None
        return LinkedConversation(
            conversation=ConversationSummaryItem.model_validate(conv),
            messages=[MessageRead.model_validate(m) for m in conv.messages],
        )

    @staticmethod
    def _build_timeline(case: Case) -> list[TimelineItem]:
        items: list[TimelineItem] = [
            TimelineItem(
                kind="case",
                label="Case created",
                detail=case.title,
                timestamp=case.created_at,
            )
        ]
        for e in case.events:
            items.append(
                TimelineItem(
                    kind="event",
                    label=f"{e.event_type.value.title()}: {e.title}",
                    detail=e.location,
                    timestamp=e.scheduled_at,
                )
            )
        for n in case.notes:
            items.append(
                TimelineItem(
                    kind="note",
                    label="Note added",
                    detail=(n.content[:120] + "...") if len(n.content) > 120 else n.content,
                    timestamp=n.created_at,
                )
            )
        for d in case.documents:
            items.append(
                TimelineItem(
                    kind="document",
                    label=f"Document: {d.filename}",
                    detail=d.document_type.value if d.document_type else None,
                    timestamp=d.created_at,
                )
            )
        # Most recent first.
        items.sort(key=lambda i: i.timestamp, reverse=True)
        return items

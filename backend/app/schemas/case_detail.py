"""Aggregated schema for the case detail page."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.conversations.schemas import ConversationSummaryItem, MessageRead
from app.documents.schemas import DocumentRead
from app.models.enums import CaseStatus, CaseUrgency, PracticeArea
from app.schemas.case_activity import CaseEventRead, CaseNoteRead, TimelineItem
from app.schemas.client import ClientRead
from app.schemas.user import UserRead


class LinkedConversation(BaseModel):
    conversation: ConversationSummaryItem
    messages: list[MessageRead]


class CaseFullDetail(BaseModel):
    id: int
    title: str
    practice_area: PracticeArea
    status: CaseStatus
    urgency: CaseUrgency
    description: str | None
    ai_summary: str | None
    created_at: datetime
    updated_at: datetime

    client: ClientRead | None
    assigned_lawyer: UserRead | None

    documents: list[DocumentRead]
    notes: list[CaseNoteRead]
    events: list[CaseEventRead]
    timeline: list[TimelineItem]
    conversation: LinkedConversation | None

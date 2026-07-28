"""API schemas for the intake chat endpoints."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.conversations.enums import (
    ConversationStatus,
    IntakePracticeArea,
    IntakeStage,
    MessageRole,
    Urgency,
)


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: MessageRole
    content: str
    created_at: datetime


class AISummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    summary: str
    client_name: str | None
    practice_area: IntakePracticeArea | None
    urgency: Urgency | None
    recommended: bool
    missing_information: list[str] = Field(default_factory=list)
    message_count: int
    created_at: datetime


class IntakeStructuredResult(BaseModel):
    """The structured JSON contract required by Sprint 2."""

    practice_area: str = ""
    urgency: str = ""
    recommended: bool = False
    missing_information: list[str] = Field(default_factory=list)


class ChatMessageRequest(BaseModel):
    conversation_id: int | None = Field(
        default=None, description="Omit to start a new intake conversation"
    )
    message: str = Field(min_length=1, max_length=4000)


class ChatMessageResponse(BaseModel):
    conversation_id: int
    stage: IntakeStage
    status: ConversationStatus
    practice_area: IntakePracticeArea | None
    assistant_message: str
    structured: IntakeStructuredResult
    case_id: int | None = None
    summary: AISummaryRead | None = None


class ConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: ConversationStatus
    stage: IntakeStage
    practice_area: IntakePracticeArea | None
    case_id: int | None
    created_at: datetime
    updated_at: datetime


class ConversationDetail(ConversationRead):
    messages: list[MessageRead] = Field(default_factory=list)
    summary: AISummaryRead | None = None


class ConversationSummaryItem(BaseModel):
    """Compact item for the conversation history list."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    status: ConversationStatus
    stage: IntakeStage
    practice_area: IntakePracticeArea | None
    created_at: datetime
    updated_at: datetime

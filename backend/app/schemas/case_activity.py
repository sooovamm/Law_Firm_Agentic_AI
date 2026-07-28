"""Schemas for case notes and timeline events."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CaseEventType


class CaseNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class CaseNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    author_id: int | None
    created_at: datetime


class CaseEventCreate(BaseModel):
    event_type: CaseEventType
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    scheduled_at: datetime
    location: str | None = Field(default=None, max_length=255)


class CaseEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: CaseEventType
    title: str
    description: str | None
    scheduled_at: datetime
    location: str | None
    created_at: datetime


class TimelineItem(BaseModel):
    """A unified timeline entry aggregating notes, events, and documents."""

    kind: str  # "event" | "note" | "document" | "case"
    label: str
    detail: str | None
    timestamp: datetime

"""API request/response schemas for deadlines."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.deadlines.enums import DeadlinePriority, DeadlineSource, DeadlineType


class DeadlineCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    due_date: datetime
    case_id: int | None = None
    deadline_type: DeadlineType = DeadlineType.OTHER
    priority: DeadlinePriority = DeadlinePriority.MEDIUM
    notes: str | None = Field(default=None, max_length=2000)


class DeadlineUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    due_date: datetime | None = None
    completed: bool | None = None
    priority: DeadlinePriority | None = None
    deadline_type: DeadlineType | None = None
    notes: str | None = Field(default=None, max_length=2000)


class DeadlineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int | None
    title: str
    due_date: datetime
    completed: bool
    priority: DeadlinePriority
    deadline_type: DeadlineType
    source: DeadlineSource
    source_reference: str | None
    notes: str | None
    created_at: datetime


class DeadlineDetail(DeadlineRead):
    case_title: str | None = None


class DeadlineBuckets(BaseModel):
    """Dashboard grouping: overdue, today, and upcoming deadlines."""

    overdue: list[DeadlineDetail]
    today: list[DeadlineDetail]
    upcoming: list[DeadlineDetail]

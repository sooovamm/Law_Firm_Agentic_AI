"""Structured-output schemas for deadline extraction.

The model returns candidate deadlines from a source text; the service validates
and dedupes them before persisting.
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from app.deadlines.enums import DeadlinePriority, DeadlineType


class ExtractedDeadline(BaseModel):
    title: str = Field(description="Short description, e.g. 'Motion to dismiss hearing'")
    deadline_type: DeadlineType
    due_date: str | None = Field(
        default=None,
        description="ISO date (YYYY-MM-DD) if a concrete calendar date is present or clearly implied",
    )
    priority: DeadlinePriority = DeadlinePriority.MEDIUM
    rationale: str = ""


class DeadlineExtraction(BaseModel):
    """All deadlines found in a single source (document or email)."""

    deadlines: list[ExtractedDeadline] = Field(default_factory=list)

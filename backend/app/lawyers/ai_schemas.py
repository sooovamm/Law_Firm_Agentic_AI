"""Pydantic schema used as the OpenAI structured-output target for lawyer matching."""
from __future__ import annotations

from pydantic import BaseModel, Field


class LawyerMatchResult(BaseModel):
    recommended_lawyer_id: int | None = None
    match_score: int = Field(ge=0, le=100)
    reasoning: list[str] = Field(default_factory=list)
    alternative_lawyer_ids: list[int] = Field(default_factory=list)

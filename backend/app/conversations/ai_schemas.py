"""Pydantic schemas used as OpenAI structured-output targets.

Each corresponds to one reasoning step in the intake graph. They are separate
from API request/response schemas so the model contract can evolve independently
of the HTTP contract.
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from app.conversations.enums import IntakePracticeArea, Urgency


class PracticeAreaDetection(BaseModel):
    practice_area: IntakePracticeArea
    confidence_rationale: str = Field(description="Why this area was chosen")


class InformationAssessment(BaseModel):
    collected: list[str] = Field(default_factory=list, description="Facts already gathered")
    missing_information: list[str] = Field(
        default_factory=list, description="Required items still missing"
    )
    next_question: str = Field(description="The single next question to ask the client")
    enough_collected: bool = Field(
        description="True if enough information has been gathered to qualify the lead"
    )


class LeadQualification(BaseModel):
    urgency: Urgency
    recommended: bool
    reasoning: str
    missing_information: list[str] = Field(default_factory=list)


class IntakeSummary(BaseModel):
    title: str
    summary: str
    key_facts: list[str] = Field(default_factory=list)
    client_name: str | None = None

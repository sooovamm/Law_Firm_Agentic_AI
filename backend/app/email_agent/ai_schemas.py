"""Structured-output schemas for the email agent's LLM calls.

These are the shapes the model is asked to return at each extraction step. They
are separate from the API response schemas so the graph and the transport layer
can evolve independently.
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from app.email_agent.enums import EmailUrgency


class ClientIdentification(BaseModel):
    """Who the email is from, in client terms."""

    client_name: str | None = Field(
        default=None, description="Best guess at the client's full name, if any"
    )
    matched: bool = Field(
        default=False, description="Whether this maps to a known client"
    )
    rationale: str = ""


class CaseIdentification(BaseModel):
    """Which case the email references, if determinable from content."""

    case_reference: str | None = Field(
        default=None, description="A case title, number, or subject reference"
    )
    matched: bool = False
    rationale: str = ""


class EmailSummary(BaseModel):
    summary: str = Field(description="A concise 2-4 sentence summary")


class ExtractedTask(BaseModel):
    description: str
    owner: str | None = None


class TaskExtraction(BaseModel):
    tasks: list[ExtractedTask] = Field(default_factory=list)


class ExtractedDeadline(BaseModel):
    description: str
    due_date: str | None = Field(
        default=None, description="ISO date (YYYY-MM-DD) if a concrete date is present"
    )


class DeadlineDetection(BaseModel):
    deadlines: list[ExtractedDeadline] = Field(default_factory=list)


class UrgencyAssessment(BaseModel):
    urgency: EmailUrgency
    rationale: str = ""


class DraftReply(BaseModel):
    subject: str
    body: str

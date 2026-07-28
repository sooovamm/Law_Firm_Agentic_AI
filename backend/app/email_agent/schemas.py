"""API request/response schemas for the email agent."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.email_agent.enums import EmailProvider, EmailStatus, EmailUrgency


class IncomingEmail(BaseModel):
    """Payload representing a received email to ingest.

    In production this is populated by the Gmail/Outlook provider; the ingest
    endpoint also accepts it directly (useful for webhooks and testing).
    """

    provider: EmailProvider
    sender: str
    receiver: str
    subject: str = ""
    body: str = ""
    external_id: str | None = None
    received_at: datetime | None = None


class TaskItem(BaseModel):
    description: str
    owner: str | None = None


class DeadlineItem(BaseModel):
    description: str
    due_date: str | None = None


class EmailRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    provider: EmailProvider
    sender: str
    receiver: str
    subject: str
    status: EmailStatus
    urgency: EmailUrgency | None
    summary: str | None
    case_id: int | None
    client_id: int | None
    received_at: datetime | None
    created_at: datetime


class EmailDetail(EmailRead):
    body: str
    tasks: list[TaskItem]
    deadlines: list[DeadlineItem]
    draft_reply: str | None
    case_title: str | None = None
    client_name: str | None = None


class ReplyRequest(BaseModel):
    email_id: int
    body: str = Field(min_length=1)
    subject: str | None = None


class ReplyResponse(BaseModel):
    email_id: int
    sent: bool
    channel: str
    subject: str
    body: str

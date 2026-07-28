"""Serialization helpers for emails."""
from __future__ import annotations

from app.email_agent.model import Email
from app.email_agent.schemas import DeadlineItem, EmailDetail, EmailRead, TaskItem


def to_read(email: Email) -> EmailRead:
    return EmailRead.model_validate(email)


def to_detail(email: Email) -> EmailDetail:
    return EmailDetail(
        id=email.id,
        provider=email.provider,
        sender=email.sender,
        receiver=email.receiver,
        subject=email.subject,
        status=email.status,
        urgency=email.urgency,
        summary=email.summary,
        case_id=email.case_id,
        client_id=email.client_id,
        received_at=email.received_at,
        created_at=email.created_at,
        body=email.body,
        tasks=[TaskItem(**t) for t in (email.tasks or [])],
        deadlines=[DeadlineItem(**d) for d in (email.deadlines or [])],
        draft_reply=email.draft_reply,
        case_title=email.case.title if email.case else None,
        client_name=email.client.full_name if email.client else None,
    )

"""Serialization helpers for deadlines."""
from __future__ import annotations

from app.deadlines.model import Deadline
from app.deadlines.schemas import DeadlineDetail, DeadlineRead


def to_read(d: Deadline) -> DeadlineRead:
    return DeadlineRead.model_validate(d)


def to_detail(d: Deadline) -> DeadlineDetail:
    return DeadlineDetail(
        id=d.id,
        case_id=d.case_id,
        title=d.title,
        due_date=d.due_date,
        completed=d.completed,
        priority=d.priority,
        deadline_type=d.deadline_type,
        source=d.source,
        source_reference=d.source_reference,
        notes=d.notes,
        created_at=d.created_at,
        case_title=d.case.title if d.case else None,
    )

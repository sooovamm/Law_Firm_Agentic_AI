"""Helper to record activity-log entries.

Flushes but does not commit, so callers control the transaction boundary.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.activity import ActivityLog
from app.models.enums import ActivityType


def log_activity(
    db: Session,
    *,
    activity_type: ActivityType,
    description: str,
    case_id: int | None = None,
    client_id: int | None = None,
    document_id: int | None = None,
    actor_id: int | None = None,
) -> ActivityLog:
    entry = ActivityLog(
        activity_type=activity_type,
        description=description,
        case_id=case_id,
        client_id=client_id,
        document_id=document_id,
        actor_id=actor_id,
    )
    db.add(entry)
    db.flush()
    return entry

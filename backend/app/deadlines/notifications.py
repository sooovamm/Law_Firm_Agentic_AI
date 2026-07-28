"""Deadline notifications.

Two channels:
- email reminders to the assigned lawyer (logged here; the real provider from
  the email agent can be wired in without touching this interface),
- dashboard alerts, which are simply the overdue/today buckets surfaced by the
  dashboard endpoint plus an ActivityLog entry recorded on creation.

Kept isolated so notification delivery can evolve independently of extraction.
"""
from __future__ import annotations

from app.core.logging import get_logger
from app.deadlines.model import Deadline

logger = get_logger(__name__)


def send_deadline_reminder(deadline: Deadline, recipient: str | None) -> str:
    """Dispatch a reminder for a single deadline. Returns the channel used."""
    when = deadline.due_date.strftime("%Y-%m-%d %H:%M UTC")
    logger.info(
        "Deadline reminder: '%s' due %s (case=%s) -> %s",
        deadline.title,
        when,
        deadline.case_id,
        recipient or "(no recipient on file)",
    )
    return "log"


def notify_lawyer_new_deadlines(case_id: int | None, count: int, recipient: str | None) -> None:
    """Notify that new deadlines were auto-created for a case."""
    if count <= 0:
        return
    logger.info(
        "Notify lawyer: %d new deadline(s) created for case=%s -> %s",
        count,
        case_id,
        recipient or "(no recipient on file)",
    )

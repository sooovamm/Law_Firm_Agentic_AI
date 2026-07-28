"""Available-slot computation for a lawyer on a given day.

Business hours are configurable; slots are generated at the requested duration's
granularity and filtered against existing active consultations. Kept pure and
reusable (no DB access here) so it is easy to test and reason about.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.scheduling.model import Consultation
from app.scheduling.schemas import AvailableSlot

# Default firm business hours (24h clock), applied in the day's timezone.
BUSINESS_START_HOUR = 9
BUSINESS_END_HOUR = 17


def _aware(dt: datetime) -> datetime:
    """Coerce a possibly-naive datetime to UTC-aware.

    SQLite drops tzinfo on DateTime(timezone=True) columns, so values read back
    can be naive. Treat naive datetimes as UTC for consistent comparisons.
    """
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt


def _overlaps(start: datetime, end: datetime, existing: list[Consultation]) -> bool:
    for c in existing:
        c_start = _aware(c.scheduled_time)
        c_end = c_start + timedelta(minutes=c.duration_minutes)
        if c_start < end and c_end > start:
            return True
    return False


def compute_available_slots(
    *,
    day_start: datetime,
    duration_minutes: int,
    existing: list[Consultation],
    business_start_hour: int = BUSINESS_START_HOUR,
    business_end_hour: int = BUSINESS_END_HOUR,
    now: datetime | None = None,
) -> list[AvailableSlot]:
    """Generate bookable slots within business hours, excluding conflicts.

    Slots step by `duration_minutes`. A slot is available when it fits within
    business hours, does not overlap an existing active consultation, and does
    not start in the past.
    """
    slots: list[AvailableSlot] = []
    window_start = day_start.replace(
        hour=business_start_hour, minute=0, second=0, microsecond=0
    )
    window_end = day_start.replace(
        hour=business_end_hour, minute=0, second=0, microsecond=0
    )

    cursor = window_start
    step = timedelta(minutes=duration_minutes)
    while cursor + step <= window_end:
        slot_end = cursor + step
        past = now is not None and cursor < now
        if not past and not _overlaps(cursor, slot_end, existing):
            slots.append(AvailableSlot(start=cursor, end=slot_end))
        cursor += step

    return slots

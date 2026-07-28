"""Enums for the consultation scheduling domain."""
from __future__ import annotations

from enum import Enum


class ConsultationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# Statuses that still occupy a time slot (block overlaps). Cancelled and
# completed consultations do not block new bookings.
ACTIVE_STATUSES: frozenset[ConsultationStatus] = frozenset(
    {ConsultationStatus.PENDING, ConsultationStatus.CONFIRMED}
)

# Default consultation length, used to derive an end time for overlap checks.
DEFAULT_DURATION_MINUTES = 60

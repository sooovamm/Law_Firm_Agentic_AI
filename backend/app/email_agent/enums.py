"""Enums for the email intelligence domain."""
from __future__ import annotations

from enum import Enum


class EmailProvider(str, Enum):
    GMAIL = "gmail"
    OUTLOOK = "outlook"


class EmailStatus(str, Enum):
    """Processing lifecycle of an ingested email."""

    RECEIVED = "received"  # stored, not yet processed by the agent
    PROCESSED = "processed"  # agent ran: summary/extraction/draft available
    REPLIED = "replied"  # a reply has been approved/sent
    FAILED = "failed"  # processing failed


class EmailUrgency(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

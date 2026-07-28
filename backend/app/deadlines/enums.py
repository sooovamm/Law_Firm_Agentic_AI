"""Enums for the court deadline domain."""
from __future__ import annotations

from enum import Enum


class DeadlineType(str, Enum):
    HEARING = "hearing"
    FILING = "filing"
    APPEAL = "appeal"
    EVIDENCE = "evidence"
    OTHER = "other"


class DeadlinePriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DeadlineSource(str, Enum):
    DOCUMENT = "document"
    EMAIL = "email"
    MANUAL = "manual"

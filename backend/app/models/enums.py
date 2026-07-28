"""Enumerations used across models and schemas."""
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    LAWYER = "lawyer"
    PARALEGAL = "paralegal"


class CaseStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    CLOSED = "closed"


class PracticeArea(str, Enum):
    CORPORATE = "corporate"
    CRIMINAL = "criminal"
    FAMILY = "family"
    IMMIGRATION = "immigration"
    INTELLECTUAL_PROPERTY = "intellectual_property"
    LABOR = "labor"
    REAL_ESTATE = "real_estate"
    TAX = "tax"
    LITIGATION = "litigation"
    OTHER = "other"


class CaseUrgency(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CaseEventType(str, Enum):
    """Scheduled or logged events attached to a case timeline."""

    CONSULTATION = "consultation"
    HEARING = "hearing"
    FILING = "filing"
    DEADLINE = "deadline"
    MEETING = "meeting"
    OTHER = "other"


class ActivityType(str, Enum):
    """Kinds of activity recorded in the activity feed."""

    CASE_CREATED = "case_created"
    CASE_UPDATED = "case_updated"
    CLIENT_CREATED = "client_created"
    DOCUMENT_UPLOADED = "document_uploaded"
    NOTE_ADDED = "note_added"
    EVENT_SCHEDULED = "event_scheduled"
    INTAKE_COMPLETED = "intake_completed"

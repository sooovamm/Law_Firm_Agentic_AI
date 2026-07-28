"""Enums for the document domain."""
from __future__ import annotations

from enum import Enum


class DocumentType(str, Enum):
    """AI classification categories for uploaded documents."""

    EMPLOYMENT = "employment"
    MEDICAL = "medical"
    CONTRACT = "contract"
    EVIDENCE = "evidence"
    POLICE_REPORT = "police_report"
    OTHER = "other"


class ProcessingStatus(str, Enum):
    """Lifecycle of a document's AI processing."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Allowed upload content types mapped to canonical file extensions.
ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "image/png": "png",
    "image/jpeg": "jpg",
}

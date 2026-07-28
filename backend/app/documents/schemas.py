"""Document schemas: API contracts and AI structured-output target."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.documents.enums import DocumentType, ProcessingStatus


class DocumentAnalysis(BaseModel):
    """Structured-output schema the LLM fills in during processing."""

    document_type: DocumentType
    summary: str
    key_facts: list[str] = Field(default_factory=list)
    important_dates: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    organizations: list[str] = Field(default_factory=list)
    missing_documents: list[str] = Field(default_factory=list)


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    url: str
    content_type: str
    size_bytes: int
    document_type: DocumentType | None
    processing_status: ProcessingStatus
    client_id: int | None
    case_id: int | None
    created_at: datetime  # serves as uploaded_at
    updated_at: datetime


class DocumentDetail(DocumentRead):
    summary: str | None = None
    key_facts: list[str] = Field(default_factory=list)
    important_dates: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    organizations: list[str] = Field(default_factory=list)
    missing_documents: list[str] = Field(default_factory=list)
    processing_error: str | None = None


class DocumentUploadResponse(BaseModel):
    document: DocumentRead
    message: str = "Upload received. Processing has started."

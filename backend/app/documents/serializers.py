"""Serialization helpers converting Document ORM to schemas."""
from __future__ import annotations

from app.documents.model import Document
from app.documents.schemas import DocumentDetail, DocumentRead


def _split(value: str | None) -> list[str]:
    return value.split("\n") if value else []


def to_read(doc: Document) -> DocumentRead:
    return DocumentRead.model_validate(doc)


def to_detail(doc: Document) -> DocumentDetail:
    return DocumentDetail(
        id=doc.id,
        filename=doc.filename,
        url=doc.url,
        content_type=doc.content_type,
        size_bytes=doc.size_bytes,
        document_type=doc.document_type,
        processing_status=doc.processing_status,
        client_id=doc.client_id,
        case_id=doc.case_id,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        summary=doc.summary,
        key_facts=_split(doc.key_facts),
        important_dates=_split(doc.important_dates),
        people=_split(doc.people),
        organizations=_split(doc.organizations),
        missing_documents=_split(doc.missing_documents),
        processing_error=doc.processing_error,
    )

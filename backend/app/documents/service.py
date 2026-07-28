"""Document management service.

Handles validation, storage, and persistence for uploads, plus listing and
deletion. AI processing is delegated to DocumentProcessor as a background job.
"""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.documents.enums import ALLOWED_CONTENT_TYPES, DocumentType, ProcessingStatus
from app.documents.model import Document
from app.documents.repository import DocumentRepository
from app.storage.base import StorageBackend

logger = get_logger(__name__)


class DocumentService:
    def __init__(self, db: Session, storage: StorageBackend) -> None:
        self.db = db
        self.storage = storage
        self.repo = DocumentRepository(db)

    def upload(
        self,
        *,
        filename: str,
        content_type: str,
        data: bytes,
        client_id: int | None,
        case_id: int | None,
        uploaded_by_id: int | None,
    ) -> Document:
        self._validate(content_type, data)

        extension = ALLOWED_CONTENT_TYPES[content_type]
        # Unique, collision-free storage key; keep the extension for clarity.
        storage_key = f"{uuid.uuid4().hex}.{extension}"

        stored = self.storage.save(storage_key, data, content_type)

        document = Document(
            filename=filename,
            storage_key=stored.key,
            url=stored.url,
            content_type=content_type,
            size_bytes=len(data),
            processing_status=ProcessingStatus.PENDING,
            client_id=client_id,
            case_id=case_id,
            uploaded_by_id=uploaded_by_id,
        )
        self.repo.add(document)
        self.db.commit()
        self.db.refresh(document)
        logger.info("Uploaded document id=%s (%s bytes)", document.id, document.size_bytes)
        return document

    def list(
        self,
        *,
        query: str | None = None,
        case_id: int | None = None,
        client_id: int | None = None,
        document_type: DocumentType | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Document]:
        return self.repo.search(
            query=query,
            case_id=case_id,
            client_id=client_id,
            document_type=document_type,
            skip=skip,
            limit=limit,
        )

    def get(self, document_id: int) -> Document:
        doc = self.repo.get(document_id)
        if doc is None:
            raise NotFoundError("Document not found")
        return doc

    def delete(self, document_id: int) -> None:
        doc = self.get(document_id)
        # Remove from storage first; if that fails we keep the DB row so it can
        # be retried rather than orphaning the stored object.
        self.storage.delete(doc.storage_key)
        self.repo.delete(doc)
        self.db.commit()
        logger.info("Deleted document id=%s", document_id)

    def load_bytes(self, document_id: int) -> tuple[bytes, str, str]:
        """Return (data, content_type, filename) for download."""
        doc = self.get(document_id)
        data = self.storage.load(doc.storage_key)
        return data, doc.content_type, doc.filename

    def _validate(self, content_type: str, data: bytes) -> None:
        if content_type not in ALLOWED_CONTENT_TYPES:
            allowed = ", ".join(sorted(ALLOWED_CONTENT_TYPES))
            raise ValidationError(f"Unsupported file type. Allowed: {allowed}")
        if len(data) == 0:
            raise ValidationError("Uploaded file is empty")
        if len(data) > settings.max_upload_bytes:
            raise ValidationError(
                f"File exceeds maximum size of {settings.max_upload_mb} MB"
            )

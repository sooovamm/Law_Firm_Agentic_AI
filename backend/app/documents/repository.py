"""Data access for documents."""
from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.documents.enums import DocumentType
from app.documents.model import Document


class DocumentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, document: Document) -> Document:
        self.db.add(document)
        self.db.flush()
        self.db.refresh(document)
        return document

    def get(self, document_id: int) -> Document | None:
        return self.db.get(Document, document_id)

    def delete(self, document: Document) -> None:
        self.db.delete(document)
        self.db.flush()

    def search(
        self,
        *,
        query: str | None = None,
        case_id: int | None = None,
        client_id: int | None = None,
        document_type: DocumentType | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Document]:
        stmt = select(Document)

        if case_id is not None:
            stmt = stmt.where(Document.case_id == case_id)
        if client_id is not None:
            stmt = stmt.where(Document.client_id == client_id)
        if document_type is not None:
            stmt = stmt.where(Document.document_type == document_type)
        if query:
            like = f"%{query}%"
            stmt = stmt.where(
                or_(
                    Document.filename.ilike(like),
                    Document.summary.ilike(like),
                    Document.extracted_text.ilike(like),
                )
            )

        stmt = stmt.order_by(Document.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

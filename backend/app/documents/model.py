"""Document ORM model."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.documents.enums import DocumentType, ProcessingStatus

if TYPE_CHECKING:
    from app.models.case import Case
    from app.models.client import Client


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    # Storage key and public/reference URL are kept separately: the key is what
    # the storage backend uses; the url is what clients dereference.
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    document_type: Mapped[DocumentType | None] = mapped_column(
        Enum(DocumentType, name="document_type", values_callable=lambda e: [m.value for m in e]),
        nullable=True,
        index=True,
    )
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        Enum(ProcessingStatus, name="processing_status", values_callable=lambda e: [m.value for m in e]),
        default=ProcessingStatus.PENDING,
        nullable=False,
        index=True,
    )
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Extracted / AI-derived content.
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    # The following are stored as newline-joined text to avoid a JSON column.
    key_facts: Mapped[str | None] = mapped_column(Text, nullable=True)
    important_dates: Mapped[str | None] = mapped_column(Text, nullable=True)
    people: Mapped[str | None] = mapped_column(Text, nullable=True)
    organizations: Mapped[str | None] = mapped_column(Text, nullable=True)
    missing_documents: Mapped[str | None] = mapped_column(Text, nullable=True)

    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    case_id: Mapped[int | None] = mapped_column(
        ForeignKey("cases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    uploaded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    client: Mapped["Client | None"] = relationship()
    case: Mapped["Case | None"] = relationship(back_populates="documents")

    def __repr__(self) -> str:
        return f"<Document id={self.id} filename={self.filename} type={self.document_type}>"

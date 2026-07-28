"""Document processing pipeline (runs as a background job).

Steps: load bytes from storage -> extract text -> AI analysis (summary, facts,
dates, people, orgs, missing docs, classification) -> persist results -> update
the linked case's rolling AI summary.

This service owns its own DB session because it executes outside the request
lifecycle (via FastAPI BackgroundTasks). It is deliberately decoupled from the
web layer so it can later be moved to a real task queue (Celery/RQ) unchanged.
"""
from __future__ import annotations

from app.ai.base import LLMClient
from app.core.logging import get_logger
from app.database.session import SessionLocal
from app.documents.analyzer import analyze_document, update_case_summary
from app.documents.enums import ProcessingStatus
from app.documents.extraction import extract_text
from app.documents.model import Document
from app.documents.repository import DocumentRepository
from app.models.case import Case
from app.storage.base import StorageBackend

logger = get_logger(__name__)


def _join(items: list[str]) -> str | None:
    return "\n".join(items) if items else None


class DocumentProcessor:
    def __init__(self, storage: StorageBackend, llm: LLMClient) -> None:
        self.storage = storage
        self.llm = llm

    def process(self, document_id: int) -> None:
        """Entry point for the background task. Never raises to the caller."""
        db = SessionLocal()
        try:
            repo = DocumentRepository(db)
            doc = repo.get(document_id)
            if doc is None:
                logger.warning("Document id=%s vanished before processing", document_id)
                return

            doc.processing_status = ProcessingStatus.PROCESSING
            db.commit()

            try:
                self._run(db, repo, doc)
                doc.processing_status = ProcessingStatus.COMPLETED
                doc.processing_error = None
                logger.info("Document id=%s processed successfully", document_id)
            except Exception as exc:  # noqa: BLE001 - background job must not crash
                db.rollback()
                doc = repo.get(document_id)
                if doc is not None:
                    doc.processing_status = ProcessingStatus.FAILED
                    doc.processing_error = str(exc)[:1000]
                logger.exception("Document id=%s processing failed", document_id)

            db.commit()
        finally:
            db.close()

    def _run(self, db, repo: DocumentRepository, doc: Document) -> None:
        raw = self.storage.load(doc.storage_key)
        text = extract_text(raw, doc.content_type)
        doc.extracted_text = text or None

        analysis = analyze_document(self.llm, doc.filename, text)
        doc.document_type = analysis.document_type
        doc.summary = analysis.summary
        doc.key_facts = _join(analysis.key_facts)
        doc.important_dates = _join(analysis.important_dates)
        doc.people = _join(analysis.people)
        doc.organizations = _join(analysis.organizations)
        doc.missing_documents = _join(analysis.missing_documents)
        db.flush()

        # Auto-update the linked case summary.
        if doc.case_id is not None:
            case = db.get(Case, doc.case_id)
            if case is not None:
                case.ai_summary = update_case_summary(self.llm, case.ai_summary, analysis)
                logger.info("Updated case id=%s summary from document id=%s", case.id, doc.id)

        # Extract court deadlines from the document text (Sprint 7).
        # Runs in the same background job; failures here must not fail the doc.
        if text:
            try:
                from app.deadlines.enums import DeadlineSource
                from app.deadlines.service import DeadlineService

                created = DeadlineService(db, self.llm).extract_from_source(
                    source_text=text,
                    case_id=doc.case_id,
                    source=DeadlineSource.DOCUMENT,
                    source_reference=f"document:{doc.id}",
                )
                if created:
                    logger.info(
                        "Extracted %d deadline(s) from document id=%s", len(created), doc.id
                    )
            except Exception:  # noqa: BLE001 - deadline extraction is best-effort
                logger.exception("Deadline extraction failed for document id=%s", doc.id)

"""Document endpoints. Thin: validation/serialization delegate to services."""
from __future__ import annotations

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    Query,
    UploadFile,
)
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.ai.base import LLMClient
from app.ai.factory import get_llm_client
from app.auth.dependencies import get_current_user, require_roles
from app.documents.enums import DocumentType
from app.documents.processor import DocumentProcessor
from app.documents.schemas import (
    DocumentDetail,
    DocumentRead,
    DocumentUploadResponse,
)
from app.documents.serializers import to_detail, to_read
from app.documents.service import DocumentService
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.storage.base import StorageBackend
from app.storage.factory import get_storage

router = APIRouter(prefix="/documents", tags=["documents"])


def get_storage_dep() -> StorageBackend:
    return get_storage()


def get_llm() -> LLMClient:
    return get_llm_client()


def _enqueue_processing(document_id: int, storage: StorageBackend) -> None:
    """Build a processor and run it. Errors are contained inside process()."""
    processor = DocumentProcessor(storage=storage, llm=get_llm_client())
    processor.process(document_id)


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    case_id: int | None = Form(default=None),
    client_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_dep),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> DocumentUploadResponse:
    data = await file.read()
    service = DocumentService(db, storage)
    document = service.upload(
        filename=file.filename or "upload",
        content_type=file.content_type or "application/octet-stream",
        data=data,
        client_id=client_id,
        case_id=case_id,
        uploaded_by_id=user.id,
    )
    # Kick off AI processing in the background so the request returns quickly.
    background.add_task(_enqueue_processing, document.id, storage)
    return DocumentUploadResponse(document=to_read(document))


@router.get("", response_model=list[DocumentRead])
def list_documents(
    q: str | None = Query(default=None, description="Search filename/summary/text"),
    case_id: int | None = Query(default=None),
    client_id: int | None = Query(default=None),
    document_type: DocumentType | None = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_dep),
    _: User = Depends(get_current_user),
) -> list[DocumentRead]:
    service = DocumentService(db, storage)
    docs = service.list(
        query=q,
        case_id=case_id,
        client_id=client_id,
        document_type=document_type,
        skip=skip,
        limit=limit,
    )
    return [to_read(d) for d in docs]


@router.get("/{document_id}", response_model=DocumentDetail)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_dep),
    _: User = Depends(get_current_user),
) -> DocumentDetail:
    service = DocumentService(db, storage)
    return to_detail(service.get(document_id))


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_dep),
    _: User = Depends(get_current_user),
) -> Response:
    service = DocumentService(db, storage)
    data, content_type, filename = service.load_bytes(document_id)
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{document_id}", response_model=dict)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_dep),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER)),
) -> dict:
    service = DocumentService(db, storage)
    service.delete(document_id)
    return {"detail": "Document deleted"}

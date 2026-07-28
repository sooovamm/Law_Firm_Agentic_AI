"""Case management endpoints."""
from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_roles
from app.database.session import get_db
from app.models.enums import CaseStatus, CaseUrgency, PracticeArea, UserRole
from app.models.user import User
from app.schemas.case import CaseCreate, CaseDetail, CaseUpdate
from app.schemas.case_activity import (
    CaseEventCreate,
    CaseEventRead,
    CaseNoteCreate,
    CaseNoteRead,
)
from app.schemas.case_detail import CaseFullDetail
from app.schemas.common import Message
from app.services.case_detail_service import CaseDetailService
from app.services.case_service import CaseService

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=list[CaseDetail])
def list_cases(
    q: str | None = Query(default=None, description="Search case title"),
    practice_area: PracticeArea | None = Query(default=None),
    assigned_lawyer_id: int | None = Query(default=None),
    case_status: CaseStatus | None = Query(default=None, alias="status"),
    urgency: CaseUrgency | None = Query(default=None),
    created_from: datetime | None = Query(default=None),
    created_to: datetime | None = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CaseDetail]:
    cases = CaseService(db).list_filtered(
        query=q,
        practice_area=practice_area,
        assigned_lawyer_id=assigned_lawyer_id,
        status=case_status,
        urgency=urgency,
        created_from=created_from,
        created_to=created_to,
        skip=skip,
        limit=limit,
    )
    return [CaseDetail.model_validate(c) for c in cases]


@router.post("", response_model=CaseDetail, status_code=status.HTTP_201_CREATED)
def create_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> CaseDetail:
    return CaseDetail.model_validate(CaseService(db).create(payload))


@router.get("/{case_id}", response_model=CaseDetail)
def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CaseDetail:
    return CaseDetail.model_validate(CaseService(db).get(case_id))


@router.get("/{case_id}/detail", response_model=CaseFullDetail)
def get_case_detail(
    case_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CaseFullDetail:
    return CaseDetailService(db).get_full_detail(case_id)


@router.patch("/{case_id}", response_model=CaseDetail)
def update_case(
    case_id: int,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> CaseDetail:
    return CaseDetail.model_validate(CaseService(db).update(case_id, payload))


@router.delete("/{case_id}", response_model=Message)
def delete_case(
    case_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER)),
) -> Message:
    CaseService(db).delete(case_id)
    return Message(detail="Case deleted")


@router.post("/{case_id}/notes", response_model=CaseNoteRead, status_code=status.HTTP_201_CREATED)
def add_note(
    case_id: int,
    payload: CaseNoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> CaseNoteRead:
    return CaseDetailService(db).add_note(case_id, payload, author_id=user.id)


@router.post("/{case_id}/events", response_model=CaseEventRead, status_code=status.HTTP_201_CREATED)
def add_event(
    case_id: int,
    payload: CaseEventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> CaseEventRead:
    return CaseDetailService(db).add_event(case_id, payload, actor_id=user.id)

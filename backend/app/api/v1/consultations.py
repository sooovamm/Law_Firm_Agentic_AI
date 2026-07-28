"""Consultation scheduling endpoints. Thin: delegate to SchedulingService."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_roles
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.scheduling.enums import DEFAULT_DURATION_MINUTES, ConsultationStatus
from app.scheduling.schemas import (
    AvailabilityResponse,
    ConsultationCreate,
    ConsultationDetail,
    ConsultationUpdate,
)
from app.scheduling.serializers import to_detail
from app.scheduling.service import SchedulingService
from app.schemas.common import Message

router = APIRouter(prefix="/consultations", tags=["consultations"])


@router.post("", response_model=ConsultationDetail, status_code=status.HTTP_201_CREATED)
def create_consultation(
    payload: ConsultationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> ConsultationDetail:
    consultation = SchedulingService(db).book(payload, actor=user)
    return to_detail(SchedulingService(db).get(consultation.id))


@router.get("", response_model=list[ConsultationDetail])
def list_consultations(
    lawyer_id: int | None = Query(default=None),
    client_id: int | None = Query(default=None),
    case_id: int | None = Query(default=None),
    consultation_status: ConsultationStatus | None = Query(default=None, alias="status"),
    start_from: datetime | None = Query(default=None),
    start_to: datetime | None = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ConsultationDetail]:
    consultations = SchedulingService(db).list(
        lawyer_id=lawyer_id,
        client_id=client_id,
        case_id=case_id,
        status=consultation_status,
        start_from=start_from,
        start_to=start_to,
        skip=skip,
        limit=limit,
    )
    return [to_detail(c) for c in consultations]


@router.get("/availability", response_model=AvailabilityResponse)
def get_availability(
    lawyer_id: int = Query(...),
    day: datetime = Query(..., description="Any datetime on the target day"),
    duration_minutes: int = Query(default=DEFAULT_DURATION_MINUTES, ge=15, le=480),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AvailabilityResponse:
    return SchedulingService(db).availability(lawyer_id, day, duration_minutes)


@router.get("/{consultation_id}", response_model=ConsultationDetail)
def get_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ConsultationDetail:
    return to_detail(SchedulingService(db).get(consultation_id))


@router.patch("/{consultation_id}", response_model=ConsultationDetail)
def update_consultation(
    consultation_id: int,
    payload: ConsultationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> ConsultationDetail:
    SchedulingService(db).update(consultation_id, payload, actor=user)
    return to_detail(SchedulingService(db).get(consultation_id))


@router.delete("/{consultation_id}", response_model=Message)
def delete_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> Message:
    # DELETE performs a cancellation (soft), preserving the record and history.
    SchedulingService(db).cancel(consultation_id, actor=user)
    return Message(detail="Consultation cancelled")

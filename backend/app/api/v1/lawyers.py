"""Lawyer profile & AI-matching endpoints. Thin: delegate to services."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_roles
from app.core.exceptions import PermissionDeniedError
from app.database.session import get_db
from app.lawyers.enums import LawyerPracticeArea
from app.lawyers.schemas import (
    AcceptingClientsUpdate,
    LawyerMatchHistoryItem,
    LawyerOnboardingStatus,
    LawyerProfileAdminRead,
    LawyerProfileRead,
    LawyerProfileUpdate,
    OverrideMatchRequest,
)
from app.lawyers.serializers import to_admin_read, to_match_history_item, to_read
from app.lawyers.service import LawyerMatchService, LawyerProfileService
from app.models.enums import UserRole
from app.models.user import User

router = APIRouter(prefix="/lawyers", tags=["lawyers"])


def _require_self_or_admin(target_user_id: int, user: User) -> None:
    if user.role != UserRole.ADMIN and user.id != target_user_id:
        raise PermissionDeniedError("You may only view your own lawyer profile")


@router.get("", response_model=list[LawyerProfileAdminRead])
def list_lawyers(
    practice_area: LawyerPracticeArea | None = Query(default=None),
    min_experience: int | None = Query(default=None, ge=0),
    max_experience: int | None = Query(default=None, ge=0),
    accepts_new_clients: bool | None = Query(default=None),
    max_workload: int | None = Query(default=None, ge=0),
    q: str | None = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> list[LawyerProfileAdminRead]:
    profiles = LawyerProfileService(db).list_filtered(
        practice_area=practice_area,
        min_experience=min_experience,
        max_experience=max_experience,
        accepts_new_clients=accepts_new_clients,
        max_workload=max_workload,
        query=q,
        skip=skip,
        limit=limit,
    )
    return [to_admin_read(p) for p in profiles]


@router.get("/me/status", response_model=LawyerOnboardingStatus)
def my_status(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LawyerOnboardingStatus:
    return LawyerProfileService(db).get_status(user.id)


@router.get("/me", response_model=LawyerProfileRead)
def my_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LawyerProfileRead:
    return to_read(LawyerProfileService(db).get_own(user.id))


@router.put("/me", response_model=LawyerProfileRead)
def save_my_draft(
    payload: LawyerProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LawyerProfileRead:
    return to_read(LawyerProfileService(db).save_draft(user.id, payload))


@router.post("/me/complete", response_model=LawyerProfileRead)
def complete_my_onboarding(
    payload: LawyerProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LawyerProfileRead:
    return to_read(LawyerProfileService(db).complete_onboarding(user.id, payload))


@router.patch("/match/{match_id}/override", response_model=LawyerMatchHistoryItem)
def override_match(
    match_id: int,
    payload: OverrideMatchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LawyerMatchHistoryItem:
    match = LawyerMatchService(db).override(match_id, payload.lawyer_id, user)
    return to_match_history_item(match)


@router.get("/{user_id}", response_model=LawyerProfileAdminRead)
def get_lawyer(
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LawyerProfileAdminRead:
    _require_self_or_admin(user_id, user)
    return to_admin_read(LawyerProfileService(db).get_by_user_id(user_id))


@router.patch("/{user_id}/accepting-clients", response_model=LawyerProfileRead)
def set_accepting_clients(
    user_id: int,
    payload: AcceptingClientsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
) -> LawyerProfileRead:
    return to_read(
        LawyerProfileService(db).set_accepting_clients(user_id, payload.accepts_new_clients)
    )


@router.get("/{user_id}/match-history", response_model=list[LawyerMatchHistoryItem])
def match_history(
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LawyerMatchHistoryItem]:
    _require_self_or_admin(user_id, user)
    matches = LawyerMatchService(db).history_for_lawyer(user_id)
    return [to_match_history_item(m) for m in matches]

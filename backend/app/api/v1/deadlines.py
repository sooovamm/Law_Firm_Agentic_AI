"""Court deadline endpoints. Thin: delegate to DeadlineService."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_roles
from app.database.session import get_db
from app.deadlines.enums import DeadlinePriority, DeadlineType
from app.deadlines.schemas import (
    DeadlineBuckets,
    DeadlineCreate,
    DeadlineDetail,
    DeadlineUpdate,
)
from app.deadlines.serializers import to_detail
from app.deadlines.service import DeadlineService
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.common import Message

router = APIRouter(prefix="/deadlines", tags=["deadlines"])


@router.get("", response_model=list[DeadlineDetail])
def list_deadlines(
    case_id: int | None = Query(default=None),
    completed: bool | None = Query(default=None),
    priority: DeadlinePriority | None = Query(default=None),
    deadline_type: DeadlineType | None = Query(default=None),
    due_before: datetime | None = Query(default=None),
    due_after: datetime | None = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DeadlineDetail]:
    deadlines = DeadlineService(db).list(
        case_id=case_id,
        completed=completed,
        priority=priority,
        deadline_type=deadline_type,
        due_before=due_before,
        due_after=due_after,
        skip=skip,
        limit=limit,
    )
    return [to_detail(d) for d in deadlines]


@router.post("", response_model=DeadlineDetail, status_code=status.HTTP_201_CREATED)
def create_deadline(
    payload: DeadlineCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> DeadlineDetail:
    deadline = DeadlineService(db).create(payload)
    return to_detail(DeadlineService(db).get(deadline.id))


@router.get("/buckets", response_model=DeadlineBuckets)
def deadline_buckets(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DeadlineBuckets:
    """Overdue / today / upcoming, for dashboard alerts."""
    b = DeadlineService(db).buckets()
    return DeadlineBuckets(
        overdue=[to_detail(d) for d in b["overdue"]],
        today=[to_detail(d) for d in b["today"]],
        upcoming=[to_detail(d) for d in b["upcoming"]],
    )


@router.get("/calendar", response_model=list[DeadlineDetail])
def deadline_calendar(
    start: datetime = Query(...),
    end: datetime = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[DeadlineDetail]:
    deadlines = DeadlineService(db).calendar(start=start, end=end)
    return [to_detail(d) for d in deadlines]


@router.post("/reminders/run", response_model=Message)
def run_reminders(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER)),
) -> Message:
    """Dispatch reminders for deadlines within the horizon (manual trigger)."""
    sent = DeadlineService(db).dispatch_reminders()
    return Message(detail=f"Dispatched {sent} reminder(s)")


@router.get("/{deadline_id}", response_model=DeadlineDetail)
def get_deadline(
    deadline_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DeadlineDetail:
    return to_detail(DeadlineService(db).get(deadline_id))


@router.patch("/{deadline_id}", response_model=DeadlineDetail)
def update_deadline(
    deadline_id: int,
    payload: DeadlineUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> DeadlineDetail:
    DeadlineService(db).update(deadline_id, payload)
    return to_detail(DeadlineService(db).get(deadline_id))


@router.delete("/{deadline_id}", response_model=Message)
def delete_deadline(
    deadline_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER)),
) -> Message:
    DeadlineService(db).delete(deadline_id)
    return Message(detail="Deadline deleted")

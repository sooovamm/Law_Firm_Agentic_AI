"""Consultation scheduling service.

Owns all business rules:
- overlap prevention (no double-booking a lawyer),
- only lawyers (or admins) may approve/confirm bookings,
- clients receive a confirmation on booking and on confirmation,
- reschedule and cancel with the same overlap and permission checks.

This is the reusable scheduling service other layers depend on; routes stay
thin. It owns the transaction boundary (commit/rollback).
"""
from __future__ import annotations

from datetime import UTC, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.core.exceptions import (
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.core.logging import get_logger
from app.models.enums import ActivityType, UserRole
from app.models.user import User
from app.repositories.client_repository import ClientRepository
from app.repositories.user_repository import UserRepository
from app.scheduling.availability import compute_available_slots
from app.scheduling.enums import ConsultationStatus
from app.scheduling.model import Consultation
from app.scheduling.notifications import send_client_confirmation
from app.scheduling.repository import ConsultationRepository
from app.scheduling.schemas import (
    AvailabilityResponse,
    ConfirmationMessage,
    ConsultationCreate,
    ConsultationUpdate,
)
from app.services.activity_logger import log_activity

logger = get_logger(__name__)

# Allowed status transitions. Terminal states (completed, cancelled) are final.
_ALLOWED_TRANSITIONS: dict[ConsultationStatus, set[ConsultationStatus]] = {
    ConsultationStatus.PENDING: {
        ConsultationStatus.CONFIRMED,
        ConsultationStatus.CANCELLED,
    },
    ConsultationStatus.CONFIRMED: {
        ConsultationStatus.COMPLETED,
        ConsultationStatus.CANCELLED,
    },
    ConsultationStatus.COMPLETED: set(),
    ConsultationStatus.CANCELLED: set(),
}


class SchedulingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = ConsultationRepository(db)
        self.users = UserRepository(db)
        self.clients = ClientRepository(db)

    # ---- booking ---------------------------------------------------------

    def book(self, data: ConsultationCreate, actor: User) -> Consultation:
        lawyer = self._require_lawyer(data.lawyer_id)
        if data.client_id is not None and self.clients.get_by_id(data.client_id) is None:
            raise ValidationError(f"Client id={data.client_id} does not exist")

        start = data.scheduled_time
        end = start + timedelta(minutes=data.duration_minutes)
        self._ensure_no_overlap(lawyer_id=lawyer.id, start=start, end=end)

        consultation = Consultation(
            lawyer_id=lawyer.id,
            client_id=data.client_id,
            case_id=data.case_id,
            scheduled_time=start,
            duration_minutes=data.duration_minutes,
            status=ConsultationStatus.PENDING,
            notes=data.notes,
            created_by_id=actor.id,
        )
        self.repo.add(consultation)
        log_activity(
            self.db,
            activity_type=ActivityType.EVENT_SCHEDULED,
            description=f"Consultation requested with {lawyer.full_name}",
            case_id=data.case_id,
            client_id=data.client_id,
            actor_id=actor.id,
        )
        self.db.commit()
        self.db.refresh(consultation)

        self._notify_client(consultation)
        logger.info("Booked consultation id=%s lawyer=%s", consultation.id, lawyer.id)
        return consultation

    # ---- update / reschedule / status ------------------------------------

    def update(self, consultation_id: int, data: ConsultationUpdate, actor: User) -> Consultation:
        consultation = self._get(consultation_id)

        # Status change (approve/confirm/complete/cancel).
        if data.status is not None and data.status != consultation.status:
            self._change_status(consultation, data.status, actor)

        # Reschedule.
        new_time = data.scheduled_time
        new_duration = data.duration_minutes or consultation.duration_minutes
        if new_time is not None or data.duration_minutes is not None:
            if consultation.status in (
                ConsultationStatus.COMPLETED,
                ConsultationStatus.CANCELLED,
            ):
                raise ValidationError("Cannot reschedule a completed or cancelled consultation")
            start = new_time or consultation.scheduled_time
            end = start + timedelta(minutes=new_duration)
            self._ensure_no_overlap(
                lawyer_id=consultation.lawyer_id,
                start=start,
                end=end,
                exclude_id=consultation.id,
            )
            consultation.scheduled_time = start
            consultation.duration_minutes = new_duration

        if data.notes is not None:
            consultation.notes = data.notes

        self.db.commit()
        self.db.refresh(consultation)
        logger.info("Updated consultation id=%s status=%s", consultation.id, consultation.status.value)
        return consultation

    def cancel(self, consultation_id: int, actor: User) -> Consultation:
        consultation = self._get(consultation_id)
        if consultation.status == ConsultationStatus.CANCELLED:
            return consultation
        if consultation.status == ConsultationStatus.COMPLETED:
            raise ValidationError("Cannot cancel a completed consultation")
        consultation.status = ConsultationStatus.CANCELLED
        self.db.commit()
        self.db.refresh(consultation)
        self._notify_client(consultation)
        logger.info("Cancelled consultation id=%s", consultation.id)
        return consultation

    # ---- reads -----------------------------------------------------------

    def get(self, consultation_id: int) -> Consultation:
        return self._get(consultation_id, with_relations=True)

    def list(self, **filters) -> list[Consultation]:
        return self.repo.list(**filters)

    def availability(
        self, lawyer_id: int, day: datetime, duration_minutes: int
    ) -> AvailabilityResponse:
        self._require_lawyer(lawyer_id)
        day_start = datetime.combine(day.date(), time.min, tzinfo=UTC)
        day_end = day_start + timedelta(days=1)
        existing = self.repo.active_for_lawyer_on_day(lawyer_id, day_start, day_end)
        slots = compute_available_slots(
            day_start=day_start,
            duration_minutes=duration_minutes,
            existing=existing,
            now=datetime.now(UTC),
        )
        return AvailabilityResponse(
            lawyer_id=lawyer_id,
            date=day_start.date().isoformat(),
            duration_minutes=duration_minutes,
            slots=slots,
        )

    # ---- internals -------------------------------------------------------

    def _get(self, consultation_id: int, with_relations: bool = False) -> Consultation:
        consultation = (
            self.repo.get_with_relations(consultation_id)
            if with_relations
            else self.repo.get(consultation_id)
        )
        if consultation is None:
            raise NotFoundError("Consultation not found")
        return consultation

    def _require_lawyer(self, lawyer_id: int) -> User:
        user = self.users.get_by_id(lawyer_id)
        if user is None:
            raise ValidationError(f"Lawyer id={lawyer_id} does not exist")
        if user.role not in (UserRole.LAWYER, UserRole.ADMIN):
            raise ValidationError("Assigned user must be a lawyer or admin")
        return user

    def _ensure_no_overlap(
        self, *, lawyer_id: int, start: datetime, end: datetime, exclude_id: int | None = None
    ) -> None:
        overlaps = self.repo.find_overlaps(
            lawyer_id=lawyer_id, start=start, end=end, exclude_id=exclude_id
        )
        if overlaps:
            raise ConflictError(
                "The lawyer already has a consultation during this time slot"
            )

    def _change_status(
        self, consultation: Consultation, new_status: ConsultationStatus, actor: User
    ) -> None:
        allowed = _ALLOWED_TRANSITIONS.get(consultation.status, set())
        if new_status not in allowed:
            raise ValidationError(
                f"Cannot change status from {consultation.status.value} to {new_status.value}"
            )

        # Only lawyers/admins may approve (confirm) a booking.
        if new_status == ConsultationStatus.CONFIRMED and actor.role not in (
            UserRole.LAWYER,
            UserRole.ADMIN,
        ):
            raise PermissionDeniedError("Only a lawyer can approve a booking")

        consultation.status = new_status
        # Notify the client on confirmation.
        if new_status == ConsultationStatus.CONFIRMED:
            # Flush so the confirmation reflects the new status; commit happens
            # in the calling method.
            self.db.flush()
            self._notify_client(consultation)

    def _notify_client(self, consultation: Consultation) -> ConfirmationMessage:
        client = (
            self.clients.get_by_id(consultation.client_id)
            if consultation.client_id
            else None
        )
        return send_client_confirmation(
            consultation,
            client_email=client.email if client else None,
            client_name=client.full_name if client else None,
        )

"""Consultation request/response schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.scheduling.enums import DEFAULT_DURATION_MINUTES, ConsultationStatus


class ConsultationCreate(BaseModel):
    lawyer_id: int
    scheduled_time: datetime
    duration_minutes: int = Field(default=DEFAULT_DURATION_MINUTES, ge=15, le=480)
    case_id: int | None = None
    client_id: int | None = None
    notes: str | None = Field(default=None, max_length=2000)


class ConsultationUpdate(BaseModel):
    """Reschedule and/or change status.

    Status transitions are validated in the service; not every field is always
    permitted for every role.
    """

    scheduled_time: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=15, le=480)
    status: ConsultationStatus | None = None
    notes: str | None = Field(default=None, max_length=2000)


class ConsultationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int | None
    lawyer_id: int
    client_id: int | None
    scheduled_time: datetime
    duration_minutes: int
    status: ConsultationStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ConsultationDetail(ConsultationRead):
    lawyer_name: str | None = None
    client_name: str | None = None
    case_title: str | None = None


class AvailableSlot(BaseModel):
    start: datetime
    end: datetime


class AvailabilityResponse(BaseModel):
    lawyer_id: int
    date: str
    duration_minutes: int
    slots: list[AvailableSlot]


class ConfirmationMessage(BaseModel):
    """Represents the confirmation delivered to the client on booking/confirm."""

    consultation_id: int
    channel: str  # e.g. "log" (no real email provider wired in this sprint)
    recipient: str | None
    message: str

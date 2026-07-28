"""Serialization helpers for consultations."""
from __future__ import annotations

from app.scheduling.model import Consultation
from app.scheduling.schemas import ConsultationDetail, ConsultationRead


def to_read(c: Consultation) -> ConsultationRead:
    return ConsultationRead.model_validate(c)


def to_detail(c: Consultation) -> ConsultationDetail:
    return ConsultationDetail(
        id=c.id,
        case_id=c.case_id,
        lawyer_id=c.lawyer_id,
        client_id=c.client_id,
        scheduled_time=c.scheduled_time,
        duration_minutes=c.duration_minutes,
        status=c.status,
        notes=c.notes,
        created_at=c.created_at,
        updated_at=c.updated_at,
        lawyer_name=c.lawyer.full_name if c.lawyer else None,
        client_name=c.client.full_name if c.client else None,
        case_title=c.case.title if c.case else None,
    )

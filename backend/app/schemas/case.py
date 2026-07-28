"""Case request/response schemas."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CaseStatus, CaseUrgency, PracticeArea
from app.schemas.client import ClientRead
from app.schemas.user import UserRead


class CaseBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    practice_area: PracticeArea
    description: str | None = None


class CaseCreate(CaseBase):
    client_id: int
    status: CaseStatus = CaseStatus.OPEN
    urgency: CaseUrgency = CaseUrgency.MEDIUM
    assigned_lawyer_id: int | None = None


class CaseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    practice_area: PracticeArea | None = None
    status: CaseStatus | None = None
    urgency: CaseUrgency | None = None
    description: str | None = None
    client_id: int | None = None
    assigned_lawyer_id: int | None = None


class CaseRead(CaseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: CaseStatus
    urgency: CaseUrgency
    client_id: int
    assigned_lawyer_id: int | None
    created_at: datetime
    updated_at: datetime


class CaseDetail(CaseRead):
    """Case with expanded relationships."""

    ai_summary: str | None = None
    client: ClientRead | None = None
    assigned_lawyer: UserRead | None = None


class DashboardStats(BaseModel):
    total_cases: int
    open_cases: int
    closed_cases: int

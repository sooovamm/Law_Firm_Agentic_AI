"""Dashboard endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.case import DashboardStats
from app.schemas.dashboard import DashboardOverview
from app.services.case_service import CaseService
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardStats:
    return CaseService(db).dashboard_stats()


@router.get("/overview", response_model=DashboardOverview)
def dashboard_overview(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardOverview:
    return DashboardService(db).overview()

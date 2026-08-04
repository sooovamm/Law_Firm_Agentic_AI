"""Aggregate all v1 routers."""
from fastapi import APIRouter

from app.api.v1 import (
    auth,
    cases,
    clients,
    consultations,
    dashboard,
    deadlines,
    documents,
    emails,
    intake,
    lawyers,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(clients.router)
api_router.include_router(cases.router)
api_router.include_router(dashboard.router)
api_router.include_router(intake.router)
api_router.include_router(documents.router)
api_router.include_router(consultations.router)
api_router.include_router(emails.router)
api_router.include_router(deadlines.router)
api_router.include_router(lawyers.router)

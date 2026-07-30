"""Authentication endpoints. Thin: delegate to AuthService."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.mailer import Mailer, get_mailer
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    OtpRequestResponse,
    RefreshRequest,
    RegisterRequest,
    RegisterVerifyRequest,
    TokenPair,
)
from app.schemas.user import UserRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register/request-otp", response_model=OtpRequestResponse)
def request_registration_otp(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    mailer: Mailer = Depends(get_mailer),
) -> OtpRequestResponse:
    expires_in_minutes = AuthService(db).request_registration_otp(payload, mailer)
    return OtpRequestResponse(
        message="Verification code sent to your email",
        expires_in_minutes=expires_in_minutes,
    )


@router.post("/register/verify-otp", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def verify_registration_otp(payload: RegisterVerifyRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user, tokens = AuthService(db).verify_registration_otp(payload)
    return AuthResponse(user=UserRead.model_validate(user), tokens=tokens)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user, tokens = AuthService(db).login(payload)
    return AuthResponse(user=UserRead.model_validate(user), tokens=tokens)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    return AuthService(db).refresh(payload.refresh_token)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)

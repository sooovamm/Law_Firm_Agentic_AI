"""Domain-level exceptions.

These are raised by the service/repository layers and translated into HTTP
responses by the exception handlers registered on the app. Keeping them free of
FastAPI/HTTP concerns keeps business logic transport-agnostic.
"""


class AppException(Exception):
    """Base class for all application exceptions."""

    status_code: int = 500
    detail: str = "Internal server error"

    def __init__(self, detail: str | None = None) -> None:
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class NotFoundError(AppException):
    status_code = 404
    detail = "Resource not found"


class ConflictError(AppException):
    status_code = 409
    detail = "Resource already exists"


class AuthenticationError(AppException):
    status_code = 401
    detail = "Could not validate credentials"


class PermissionDeniedError(AppException):
    status_code = 403
    detail = "You do not have permission to perform this action"


class ValidationError(AppException):
    status_code = 422
    detail = "Validation failed"

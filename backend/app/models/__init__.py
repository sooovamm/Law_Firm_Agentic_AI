"""Import all models here so Alembic autogenerate can discover them."""
from app.conversations.models import AISummary, Conversation, Message
from app.deadlines.model import Deadline
from app.documents.model import Document
from app.email_agent.model import Email
from app.lawyers.model import LawyerMatchRecommendation, LawyerProfile, LawyerSecondaryPracticeArea
from app.models.activity import ActivityLog
from app.models.case import Case
from app.models.case_activity import CaseEvent, CaseNote
from app.models.client import Client
from app.models.email_otp import EmailOtp
from app.models.enums import CaseStatus, PracticeArea, UserRole
from app.models.user import User
from app.scheduling.model import Consultation

__all__ = [
    "User",
    "Client",
    "Case",
    "UserRole",
    "CaseStatus",
    "PracticeArea",
    "Conversation",
    "Message",
    "AISummary",
    "Document",
    "CaseNote",
    "CaseEvent",
    "ActivityLog",
    "Consultation",
    "Email",
    "Deadline",
    "EmailOtp",
    "LawyerProfile",
    "LawyerSecondaryPracticeArea",
    "LawyerMatchRecommendation",
]

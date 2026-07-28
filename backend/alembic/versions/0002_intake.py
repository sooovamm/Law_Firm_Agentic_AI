"""intake: conversations, messages, ai_summaries

Revision ID: 0002_intake
Revises: 0001_initial
Create Date: 2026-07-27 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002_intake"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


conversation_status = postgresql.ENUM(
    "active", "completed", "abandoned", name="conversation_status", create_type=False)
intake_stage = postgresql.ENUM(
    "greeting",
    "practice_area_detection",
    "information_collection",
    "lead_qualification",
    "generate_summary",
    "create_case",
    "finished",
    name="intake_stage", create_type=False)
intake_practice_area = postgresql.ENUM(
    "divorce",
    "criminal",
    "employment",
    "immigration",
    "property",
    "personal_injury",
    "contract_disputes",
    "other",
    name="intake_practice_area", create_type=False)
message_role = postgresql.ENUM("user", "assistant", "system", name="message_role", create_type=False)
urgency = postgresql.ENUM("low", "medium", "high", "critical", name="urgency", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    conversation_status.create(bind, checkfirst=True)
    intake_stage.create(bind, checkfirst=True)
    intake_practice_area.create(bind, checkfirst=True)
    message_role.create(bind, checkfirst=True)
    urgency.create(bind, checkfirst=True)

    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("status", conversation_status, nullable=False, server_default="active"),
        sa.Column("stage", intake_stage, nullable=False, server_default="greeting"),
        sa.Column("practice_area", intake_practice_area, nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("case_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_conversations_id", "conversations", ["id"])
    op.create_index("ix_conversations_status", "conversations", ["status"])
    op.create_index("ix_conversations_created_by_id", "conversations", ["created_by_id"])
    op.create_index("ix_conversations_case_id", "conversations", ["case_id"])

    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("role", message_role, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_messages_id", "messages", ["id"])
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])

    op.create_table(
        "ai_summaries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("client_name", sa.String(length=255), nullable=True),
        sa.Column("practice_area", intake_practice_area, nullable=True),
        sa.Column("urgency", urgency, nullable=True),
        sa.Column("recommended", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("missing_information", sa.Text(), nullable=True),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("conversation_id", name="uq_ai_summaries_conversation_id"),
    )
    op.create_index("ix_ai_summaries_id", "ai_summaries", ["id"])
    op.create_index("ix_ai_summaries_conversation_id", "ai_summaries", ["conversation_id"])


def downgrade() -> None:
    op.drop_table("ai_summaries")
    op.drop_table("messages")
    op.drop_table("conversations")

    bind = op.get_bind()
    urgency.drop(bind, checkfirst=True)
    message_role.drop(bind, checkfirst=True)
    intake_practice_area.drop(bind, checkfirst=True)
    intake_stage.drop(bind, checkfirst=True)
    conversation_status.drop(bind, checkfirst=True)

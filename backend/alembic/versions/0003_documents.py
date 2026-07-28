"""documents: table + cases.ai_summary

Revision ID: 0003_documents
Revises: 0002_intake
Create Date: 2026-07-27 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003_documents"
down_revision: str | None = "0002_intake"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


document_type = postgresql.ENUM(
    "employment",
    "medical",
    "contract",
    "evidence",
    "police_report",
    "other",
    name="document_type", create_type=False)
processing_status = postgresql.ENUM(
    "pending", "processing", "completed", "failed", name="processing_status", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    document_type.create(bind, checkfirst=True)
    processing_status.create(bind, checkfirst=True)

    op.add_column("cases", sa.Column("ai_summary", sa.Text(), nullable=True))

    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("filename", sa.String(length=512), nullable=False),
        sa.Column("storage_key", sa.String(length=1024), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("document_type", document_type, nullable=True),
        sa.Column("processing_status", processing_status, nullable=False, server_default="pending"),
        sa.Column("processing_error", sa.Text(), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("key_facts", sa.Text(), nullable=True),
        sa.Column("important_dates", sa.Text(), nullable=True),
        sa.Column("people", sa.Text(), nullable=True),
        sa.Column("organizations", sa.Text(), nullable=True),
        sa.Column("missing_documents", sa.Text(), nullable=True),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("case_id", sa.Integer(), nullable=True),
        sa.Column("uploaded_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("storage_key", name="uq_documents_storage_key"),
    )
    op.create_index("ix_documents_id", "documents", ["id"])
    op.create_index("ix_documents_document_type", "documents", ["document_type"])
    op.create_index("ix_documents_processing_status", "documents", ["processing_status"])
    op.create_index("ix_documents_client_id", "documents", ["client_id"])
    op.create_index("ix_documents_case_id", "documents", ["case_id"])


def downgrade() -> None:
    op.drop_table("documents")
    op.drop_column("cases", "ai_summary")

    bind = op.get_bind()
    processing_status.drop(bind, checkfirst=True)
    document_type.drop(bind, checkfirst=True)

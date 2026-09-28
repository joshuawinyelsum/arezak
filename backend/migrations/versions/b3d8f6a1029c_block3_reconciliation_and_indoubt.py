"""Add durable reconciliation evidence and IN_DOUBT to lifecycle constraint.

Revision ID: b3d8f6a1029c
Revises: 57987abcf1a6
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "b3d8f6a1029c"
down_revision: Union[str, None] = "57987abcf1a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("chk_transaction_status", "transactions", type_="check")
    op.create_check_constraint(
        "chk_transaction_status", "transactions",
        "status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'IN_DOUBT')",
    )
    op.create_table(
        "reconciliation_records",
        sa.Column("transaction_id", sa.UUID(), nullable=True),
        sa.Column("provider_attempt_id", sa.UUID(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("discrepancy_code", sa.String(length=100), nullable=True),
        sa.Column("evidence_json", sa.Text(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["provider_attempt_id"], ["provider_attempts.id"]),
        sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reconciliation_records_transaction_id", "reconciliation_records", ["transaction_id"])
    op.create_index("ix_reconciliation_records_provider_attempt_id", "reconciliation_records", ["provider_attempt_id"])


def downgrade() -> None:
    op.drop_index("ix_reconciliation_records_provider_attempt_id", table_name="reconciliation_records")
    op.drop_index("ix_reconciliation_records_transaction_id", table_name="reconciliation_records")
    op.drop_table("reconciliation_records")
    op.drop_constraint("chk_transaction_status", "transactions", type_="check")
    op.create_check_constraint(
        "chk_transaction_status", "transactions",
        "status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')",
    )

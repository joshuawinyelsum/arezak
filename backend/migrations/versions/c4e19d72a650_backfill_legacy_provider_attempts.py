"""Reconstruct minimal attempt records from legacy external transactions.

Revision ID: c4e19d72a650
Revises: b3d8f6a1029c
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "c4e19d72a650"
down_revision: Union[str, None] = "b3d8f6a1029c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Block 2 transactions predate durable attempts. Rebuild the information
    # still available on Transaction after the old request table was retired.
    # These records intentionally carry UNKNOWN rail/provider where the original
    # transaction did not retain that information.
    op.execute(sa.text("""
        INSERT INTO provider_attempts (
            id, transaction_id, provider_code, rail, operation, attempt_number,
            status, provider_idempotency_key, provider_reference, amount_pesewas,
            destination_address, destination_type, request_payload, response_payload,
            error_code, error_message, dispatched_at, responded_at, created_at, updated_at
        )
        SELECT md5(t.id::text || '-legacy-provider-attempt')::uuid,
            t.id, COALESCE(t.provider_name, 'LEGACY_UNKNOWN'), 'UNKNOWN', t.type::text, 1,
            CASE t.status
                WHEN 'COMPLETED' THEN 'SUCCEEDED'
                WHEN 'FAILED' THEN 'FAILED'
                WHEN 'CANCELLED' THEN 'FAILED'
                WHEN 'IN_DOUBT' THEN 'IN_DOUBT'
                WHEN 'PROCESSING' THEN 'DISPATCHED'
                ELSE 'PENDING'
            END,
            'legacy-' || t.id::text, t.provider_reference, t.amount,
            t.destination_address, t.destination_type, NULL, NULL,
            NULL, t.failure_reason, NULL, NULL, t.created_at, t.updated_at
        FROM transactions t
        WHERE t.type::text IN ('FUND', 'SEND', 'PAY', 'WITHDRAW')
          AND NOT EXISTS (
              SELECT 1 FROM provider_attempts a WHERE a.transaction_id = t.id
          )
    """))


def downgrade() -> None:
    op.execute(sa.text("""
        DELETE FROM provider_attempts
        WHERE provider_idempotency_key LIKE 'legacy-%'
          AND request_payload IS NULL AND response_payload IS NULL
    """))

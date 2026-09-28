"""Block 2: Financial Operations Engine

Revision ID: 558b975d4a12
Revises: a3f9c1d72b4e
Create Date: 2026-09-27 23:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '558b975d4a12'
down_revision: Union[str, None] = 'a3f9c1d72b4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── TRANSACTIONS TABLE CHANGES ───────────────────────────────────────────
    # Add new columns to transactions
    op.add_column('transactions', sa.Column('destination_type', sa.String(length=50), nullable=True))
    op.add_column('transactions', sa.Column('destination_address', sa.String(length=255), nullable=True))
    op.add_column('transactions', sa.Column('fee_amount', sa.Integer(), server_default='0', nullable=False))
    op.add_column('transactions', sa.Column('fee_for_transaction_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('transactions', sa.Column('provider_name', sa.String(length=100), nullable=True))
    op.add_column('transactions', sa.Column('provider_reference', sa.String(length=255), nullable=True))
    op.add_column('transactions', sa.Column('failure_reason', sa.String(length=500), nullable=True))

    # Add index and FK for fee_for_transaction_id
    op.create_index(op.f('ix_transactions_provider_reference'), 'transactions', ['provider_reference'], unique=False)
    op.create_foreign_key('fk_transactions_fee_for_transaction_id', 'transactions', 'transactions', ['fee_for_transaction_id'], ['id'])

    # Add CHECK constraint for transaction status (state machine)
    # Status was already a string, we just enforce the domain now.
    op.create_check_constraint(
        'chk_transaction_status',
        'transactions',
        "status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')"
    )


    # ── PROVIDER_REQUESTS TABLE ──────────────────────────────────────────────
    op.create_table('provider_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        
        sa.Column('transaction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider_name', sa.String(length=100), nullable=False),
        sa.Column('operation', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('provider_reference', sa.String(length=255), nullable=True),
        sa.Column('amount_pesewas', sa.Integer(), nullable=False),
        sa.Column('destination_address', sa.String(length=255), nullable=True),
        sa.Column('destination_type', sa.String(length=50), nullable=True),
        sa.Column('request_payload', sa.Text(), nullable=True),
        sa.Column('response_payload', sa.Text(), nullable=True),
        sa.Column('error_code', sa.String(length=100), nullable=True),
        sa.Column('error_message', sa.String(length=500), nullable=True),
        sa.Column('dispatched_at', sa.DateTime(), nullable=True),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['transaction_id'], ['transactions.id'], )
    )
    op.create_index(op.f('ix_provider_requests_provider_reference'), 'provider_requests', ['provider_reference'], unique=False)
    op.create_index(op.f('ix_provider_requests_transaction_id'), 'provider_requests', ['transaction_id'], unique=False)

    # Status check constraint for ProviderRequest
    op.create_check_constraint(
        'chk_provider_request_status',
        'provider_requests',
        "status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT')"
    )


def downgrade() -> None:
    # ── DROP PROVIDER_REQUESTS ───────────────────────────────────────────────
    op.drop_index(op.f('ix_provider_requests_transaction_id'), table_name='provider_requests')
    op.drop_index(op.f('ix_provider_requests_provider_reference'), table_name='provider_requests')
    op.drop_table('provider_requests')

    # ── REVERT TRANSACTIONS ──────────────────────────────────────────────────
    op.drop_constraint('chk_transaction_status', 'transactions', type_='check')
    op.drop_constraint('fk_transactions_fee_for_transaction_id', 'transactions', type_='foreignkey')
    op.drop_index(op.f('ix_transactions_provider_reference'), table_name='transactions')
    
    op.drop_column('transactions', 'failure_reason')
    op.drop_column('transactions', 'provider_reference')
    op.drop_column('transactions', 'provider_name')
    op.drop_column('transactions', 'fee_for_transaction_id')
    op.drop_column('transactions', 'fee_amount')
    op.drop_column('transactions', 'destination_address')
    op.drop_column('transactions', 'destination_type')

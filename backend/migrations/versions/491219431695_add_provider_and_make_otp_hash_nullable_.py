"""Add provider and make otp_hash nullable for Arkesel

Revision ID: 491219431695
Revises: block7_identity_models
Create Date: 2026-10-02 01:29:54.264805

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '491219431695'
down_revision: Union[str, None] = 'block7_identity_models'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('phone_verification_attempts', 'otp_hash',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    op.add_column('phone_verification_attempts', sa.Column('provider', sa.String(length=50), nullable=True))
    op.add_column('phone_verification_attempts', sa.Column('provider_managed', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('phone_verification_attempts', 'provider_managed')
    op.drop_column('phone_verification_attempts', 'provider')
    op.alter_column('phone_verification_attempts', 'otp_hash',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)

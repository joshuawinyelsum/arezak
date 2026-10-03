"""Add notification preferences

Revision ID: e71b2d3c90ab
Revises: block7_identity_models
Create Date: 2026-10-03 07:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'e71b2d3c90ab'
down_revision = 'block7_identity_models'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('users', sa.Column('notification_preferences', sa.JSON(), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'notification_preferences')

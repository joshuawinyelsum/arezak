"""Merge heads

Revision ID: f85bd4e45960
Revises: 00be7747053d, 558b975d4a12
Create Date: 2026-09-27 23:45:28.617676

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f85bd4e45960'
down_revision: Union[str, None] = ('00be7747053d', '558b975d4a12')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass


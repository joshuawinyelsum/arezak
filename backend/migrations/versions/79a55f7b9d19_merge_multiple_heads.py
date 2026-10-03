"""Merge multiple heads

Revision ID: 79a55f7b9d19
Revises: 491219431695, e71b2d3c90ab
Create Date: 2026-10-03 08:40:25.386270

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '79a55f7b9d19'
down_revision: Union[str, None] = ('491219431695', 'e71b2d3c90ab')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass


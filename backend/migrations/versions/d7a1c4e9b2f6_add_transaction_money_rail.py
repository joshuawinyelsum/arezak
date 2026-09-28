"""Persist provider-independent rail selection on external transactions.

Revision ID: d7a1c4e9b2f6
Revises: c4e19d72a650
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d7a1c4e9b2f6"
down_revision: Union[str, None] = "c4e19d72a650"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("rail", sa.String(length=50), nullable=True))
    op.execute(sa.text("""
        UPDATE transactions AS t
        SET rail = (
            SELECT a.rail FROM provider_attempts AS a
            WHERE a.transaction_id = t.id
            ORDER BY a.attempt_number ASC LIMIT 1
        )
        WHERE t.type::text IN ('FUND', 'SEND', 'PAY', 'WITHDRAW')
    """))


def downgrade() -> None:
    op.drop_column("transactions", "rail")

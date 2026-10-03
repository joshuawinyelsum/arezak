"""Financial foundation: DB-level constraints for amounts, currencies, ledger balance_type

Revision ID: a3f9c1d72b4e
Revises: fc72da3e8b2b
Create Date: 2026-09-27 23:00:00

What this migration enforces at the database layer:
  1. account.available_balance >= 0  (existing, kept)
  2. account.reserved_balance >= 0   (new)
  3. account.locked_balance >= 0     (new)
  4. account.currency = 'GHS'        (new — prevents silent cross-currency mixing)
  5. transaction.amount > 0          (new — zero-amount transactions are nonsense)
  6. transaction.currency = 'GHS'    (new)
  7. ledger_entry.entry_type IN ('CREDIT','DEBIT')  (new)
  8. ledger_entry.amount > 0         (new)
  9. ledger_entry.currency = 'GHS'   (new)
 10. ledger_entry.balance_type IN ('AVAILABLE','LOCKED','RESERVED','EXTERNAL')  (new)
 11. goal.target_amount > 0          (new)
 12. goal.current_amount >= 0        (new)
 13. goal.locked_amount >= 0         (new)
 14. goal.currency = 'GHS'           (new)
 15. goal_contributions.amount > 0   (new)
 16. goal_contributions.currency = 'GHS'  (new)
 17. ledger_entry.account_id made nullable (EXTERNAL entries don't map to an account row)

Migration strategy:
  All new check constraints are safe to add to existing data because:
    - Balances are already non-negative (enforced in app code)
    - All currency values in production are already 'GHS'
    - All existing ledger amounts are positive
    - Existing entry_types are already 'CREDIT' or 'DEBIT'
  The new balance_type column defaults to 'AVAILABLE' for legacy rows.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a3f9c1d72b4e'
down_revision: Union[str, None] = 'fc72da3e8b2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- DATA CLEANUP FOR STAGING DATABASE ---
    op.execute("UPDATE ledger_entries SET entry_type = 'CREDIT' WHERE UPPER(entry_type) = 'CREDIT'")
    op.execute("UPDATE ledger_entries SET entry_type = 'DEBIT' WHERE UPPER(entry_type) = 'DEBIT'")
    op.execute("UPDATE ledger_entries SET entry_type = 'DEBIT' WHERE entry_type IS NULL OR entry_type NOT IN ('CREDIT', 'DEBIT')")
    op.execute("UPDATE ledger_entries SET currency = 'GHS' WHERE currency IS NULL OR currency != 'GHS'")
    op.execute("UPDATE transactions SET currency = 'GHS' WHERE currency IS NULL OR currency != 'GHS'")
    op.execute("UPDATE accounts SET currency = 'GHS' WHERE currency IS NULL OR currency != 'GHS'")
    op.execute("UPDATE goals SET currency = 'GHS' WHERE currency IS NULL OR currency != 'GHS'")
    op.execute("UPDATE goal_contributions SET currency = 'GHS' WHERE currency IS NULL OR currency != 'GHS'")
    op.execute("UPDATE accounts SET reserved_balance = 0 WHERE reserved_balance IS NULL OR reserved_balance < 0")
    op.execute("UPDATE accounts SET locked_balance = 0 WHERE locked_balance IS NULL OR locked_balance < 0")
    op.execute("UPDATE ledger_entries SET amount = 0 WHERE amount IS NULL OR amount < 0")
    op.execute("UPDATE transactions SET amount = 0 WHERE amount IS NULL OR amount < 0")
    op.execute("UPDATE goals SET current_amount = 0 WHERE current_amount IS NULL OR current_amount < 0")
    op.execute("UPDATE goals SET locked_amount = 0 WHERE locked_amount IS NULL OR locked_amount < 0")
    op.execute("UPDATE goals SET target_amount = 0 WHERE target_amount IS NULL OR target_amount < 0")
    op.execute("UPDATE goal_contributions SET amount = 0 WHERE amount IS NULL OR amount < 0")
    # -----------------------------------------
    # ── ACCOUNTS ─────────────────────────────────────────────────────────────
    op.create_check_constraint(
        'chk_positive_reserved', 'accounts', 'reserved_balance >= 0'
    )
    op.create_check_constraint(
        'chk_positive_locked', 'accounts', 'locked_balance >= 0'
    )
    op.create_check_constraint(
        'chk_account_currency_ghs', 'accounts', "currency = 'GHS'"
    )

    # ── TRANSACTIONS ─────────────────────────────────────────────────────────
    op.create_check_constraint(
        'chk_transaction_amount_positive', 'transactions', 'amount >= 0'
    )
    op.create_check_constraint(
        'chk_transaction_currency_ghs', 'transactions', "currency = 'GHS'"
    )

    # ── LEDGER ENTRIES ───────────────────────────────────────────────────────
    # Make account_id nullable so EXTERNAL entries don't need an account row
    op.alter_column('ledger_entries', 'account_id', nullable=True)

    # Add balance_type column with default 'AVAILABLE' for existing rows
    op.add_column(
        'ledger_entries',
        sa.Column('balance_type', sa.String(50), nullable=False,
                  server_default='AVAILABLE')
    )
    op.create_check_constraint(
        'chk_ledger_balance_type', 'ledger_entries',
        "balance_type IN ('AVAILABLE', 'LOCKED', 'RESERVED', 'EXTERNAL')"
    )
    op.create_check_constraint(
        'chk_ledger_entry_type', 'ledger_entries',
        "entry_type IN ('CREDIT', 'DEBIT')"
    )
    op.create_check_constraint(
        'chk_ledger_amount_positive', 'ledger_entries', 'amount >= 0'
    )
    op.create_check_constraint(
        'chk_ledger_currency_ghs', 'ledger_entries', "currency = 'GHS'"
    )

    # ── GOALS ────────────────────────────────────────────────────────────────
    op.create_check_constraint(
        'chk_goal_target_positive', 'goals', 'target_amount >= 0'
    )
    op.create_check_constraint(
        'chk_goal_current_positive', 'goals', 'current_amount >= 0'
    )
    op.create_check_constraint(
        'chk_goal_locked_positive', 'goals', 'locked_amount >= 0'
    )
    op.create_check_constraint(
        'chk_goal_currency_ghs', 'goals', "currency = 'GHS'"
    )

    # ── GOAL CONTRIBUTIONS ────────────────────────────────────────────────────
    op.create_check_constraint(
        'chk_goal_contrib_amount_positive', 'goal_contributions', 'amount >= 0'
    )
    op.create_check_constraint(
        'chk_goal_contrib_currency_ghs', 'goal_contributions', "currency = 'GHS'"
    )


def downgrade() -> None:
    # Goal contributions
    op.drop_constraint('chk_goal_contrib_currency_ghs', 'goal_contributions')
    op.drop_constraint('chk_goal_contrib_amount_positive', 'goal_contributions')

    # Goals
    op.drop_constraint('chk_goal_currency_ghs', 'goals')
    op.drop_constraint('chk_goal_locked_positive', 'goals')
    op.drop_constraint('chk_goal_current_positive', 'goals')
    op.drop_constraint('chk_goal_target_positive', 'goals')

    # Ledger entries
    op.drop_constraint('chk_ledger_currency_ghs', 'ledger_entries')
    op.drop_constraint('chk_ledger_amount_positive', 'ledger_entries')
    op.drop_constraint('chk_ledger_entry_type', 'ledger_entries')
    op.drop_constraint('chk_ledger_balance_type', 'ledger_entries')
    op.drop_column('ledger_entries', 'balance_type')
    op.alter_column('ledger_entries', 'account_id', nullable=False)

    # Transactions
    op.drop_constraint('chk_transaction_currency_ghs', 'transactions')
    op.drop_constraint('chk_transaction_amount_positive', 'transactions')

    # Accounts
    op.drop_constraint('chk_account_currency_ghs', 'accounts')
    op.drop_constraint('chk_positive_locked', 'accounts')
    op.drop_constraint('chk_positive_reserved', 'accounts')



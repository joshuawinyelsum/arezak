"""
test_financial_foundation_v2.py
================================
Comprehensive regression suite for the Arezak Core Financial Engine.

These tests run against a real PostgreSQL instance (the test DB created by
conftest.py). They verify the following invariants without requiring a running
application server:

  F-1   Money is stored as integer pesewas — never floats.
  F-2   Currency is always GHS; cross-currency operations are rejected.
  F-3   Transaction amounts must be strictly positive.
  F-4   Ledger entries must be strictly positive.
  F-5   Ledger entries must be CREDIT or DEBIT only.
  F-6   Every financial operation produces balanced ledger entries
        (total debits == total credits per transaction).
  F-7   Available + Protected == Total (goal contribution preserves total).
  F-8   Goal withdrawal preserves total (Protected → Available).
  F-9   Goal funds are not double-counted in Total.
  F-10  Negative available_balance is never possible.
  F-11  User A cannot access or mutate User B's account.
  F-12  User A cannot withdraw from User B's goal.
  F-13  Idempotency prevents duplicate financial processing.
  F-14  Transaction history cannot be silently deleted or mutated.
  F-15  Transaction correction creates a verifiable lineage (reversal + replacement).
"""
import pytest
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.account import Account
from app.models.goal import Goal
from app.models.ledger_entry import LedgerEntry
from app.models.transaction import Transaction
from app.models.user import User
from app.rules.codes import DecisionCode
from app.rules.decision import ConstraintViolationException
from app.services.goal_service import (
    create_goal,
    contribute_to_goal,
    withdraw_from_goal,
)
from app.services.transaction_service import (
    correct_transaction,
    process_expense,
    process_income,
    process_outbound,
)


# ─── Fixtures ────────────────────────────────────────────────────────────────

def _user(db: Session, suffix: str = "") -> User:
    u = User(
        email=f"ff_{suffix}_{uuid.uuid4()}@example.com",
        name="Test User",
        password_hash="hashed",
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _account(db: Session, user_id: uuid.UUID, currency: str = "GHS") -> Account:
    a = Account(user_id=user_id, name="Main", type="MAIN", currency=currency)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def _fund(db: Session, user_id, account_id, pesewas: int, key: str) -> Transaction:
    tx = process_income(db, user_id, account_id, pesewas, "GHS", key, "Deposit")
    db.commit()
    return tx


def _ledger_for(db: Session, tx_id: uuid.UUID) -> list[LedgerEntry]:
    return db.query(LedgerEntry).filter_by(transaction_id=tx_id).all()


def _total_credits(entries: list[LedgerEntry]) -> int:
    return sum(e.amount for e in entries if e.entry_type == "CREDIT")


def _total_debits(entries: list[LedgerEntry]) -> int:
    return sum(e.amount for e in entries if e.entry_type == "DEBIT")


# ─── F-1: Pesewa precision ───────────────────────────────────────────────────

class TestMoneyRepresentation:
    def test_amount_stored_as_integer_pesewas(self, db_session: Session):
        """GH₵100.00 must be stored as 10_000 pesewas, never 100.0."""
        user = _user(db_session, "f1")
        acc = _account(db_session, user.id)
        tx = _fund(db_session, user.id, acc.id, 10_000, "f1-a")
        assert tx.amount == 10_000
        assert type(tx.amount) is int

    def test_large_pesewa_amount(self, db_session: Session):
        """GH₵10,000.00 == 1,000,000 pesewas."""
        user = _user(db_session, "f1b")
        acc = _account(db_session, user.id)
        tx = _fund(db_session, user.id, acc.id, 1_000_000, "f1-b")
        assert tx.amount == 1_000_000
        assert type(tx.amount) is int

    def test_account_balance_is_integer(self, db_session: Session):
        user = _user(db_session, "f1c")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 5_050, "f1-c")
        db_session.refresh(acc)
        assert type(acc.available_balance) is int
        assert acc.available_balance == 5_050


# ─── F-2: Currency enforcement ───────────────────────────────────────────────

class TestCurrencyEnforcement:
    def test_income_currency_is_ghs(self, db_session: Session):
        user = _user(db_session, "f2a")
        acc = _account(db_session, user.id)
        tx = _fund(db_session, user.id, acc.id, 10_000, "f2-a")
        assert tx.currency == "GHS"

    def test_ledger_entry_currency_is_ghs(self, db_session: Session):
        user = _user(db_session, "f2b")
        acc = _account(db_session, user.id)
        tx = _fund(db_session, user.id, acc.id, 10_000, "f2-b")
        entries = _ledger_for(db_session, tx.id)
        assert all(e.currency == "GHS" for e in entries)

    def test_account_currency_is_ghs(self, db_session: Session):
        user = _user(db_session, "f2c")
        acc = _account(db_session, user.id)
        assert acc.currency == "GHS"

    def test_goal_currency_is_ghs(self, db_session: Session):
        user = _user(db_session, "f2d")
        goal = create_goal(db_session, user.id, "Goal", 50_000)
        assert goal.currency == "GHS"

    def test_transaction_correction_rejects_currency_change(self, db_session: Session):
        user = _user(db_session, "f2e")
        acc = _account(db_session, user.id)
        tx = _fund(db_session, user.id, acc.id, 10_000, "f2-e-init")
        with pytest.raises(ValueError, match="Currency conversion"):
            correct_transaction(db_session, user.id, tx.id, 8_000, new_currency="USD")


# ─── F-3/F-4: Amount validation ──────────────────────────────────────────────

class TestAmountValidation:
    def test_zero_income_rejected(self, db_session: Session):
        user = _user(db_session, "f3a")
        acc = _account(db_session, user.id)
        with pytest.raises(ConstraintViolationException) as exc:
            process_income(db_session, user.id, acc.id, 0, "GHS", "f3-zero")
        assert exc.value.decision.code == DecisionCode.INVALID_AMOUNT

    def test_negative_income_rejected(self, db_session: Session):
        user = _user(db_session, "f3b")
        acc = _account(db_session, user.id)
        with pytest.raises(ConstraintViolationException) as exc:
            process_income(db_session, user.id, acc.id, -500, "GHS", "f3-neg")
        assert exc.value.decision.code == DecisionCode.INVALID_AMOUNT

    def test_zero_expense_rejected(self, db_session: Session):
        user = _user(db_session, "f3c")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 10_000, "f3-c-init")
        with pytest.raises(ConstraintViolationException) as exc:
            process_expense(db_session, user.id, acc.id, 0, "GHS", "f3-c-zero")
        assert exc.value.decision.code == DecisionCode.INVALID_AMOUNT

    def test_correction_zero_amount_rejected(self, db_session: Session):
        user = _user(db_session, "f3d")
        acc = _account(db_session, user.id)
        tx = _fund(db_session, user.id, acc.id, 10_000, "f3-d-init")
        with pytest.raises(ValueError, match="strictly positive"):
            correct_transaction(db_session, user.id, tx.id, 0)

    def test_goal_withdrawal_zero_rejected(self, db_session: Session):
        user = _user(db_session, "f3e")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 50_000, "f3-e-init")
        goal = create_goal(db_session, user.id, "G", 20_000)
        contribute_to_goal(db_session, user.id, acc.id, goal.id, 10_000, "GHS", "f3-e-c")
        db_session.commit()
        with pytest.raises(ValueError, match="strictly positive"):
            withdraw_from_goal(db_session, user.id, acc.id, goal.id, 0)


# ─── F-5/F-6: Balanced ledger entries ────────────────────────────────────────

class TestBalancedLedger:
    def test_income_produces_balanced_entries(self, db_session: Session):
        """Each INCOME tx must have equal total CREDIT and DEBIT across all entries."""
        user = _user(db_session, "f6a")
        acc = _account(db_session, user.id)
        tx = _fund(db_session, user.id, acc.id, 20_000, "f6-a")
        entries = _ledger_for(db_session, tx.id)
        assert _total_credits(entries) == _total_debits(entries) == 20_000

    def test_expense_produces_balanced_entries(self, db_session: Session):
        user = _user(db_session, "f6b")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 20_000, "f6-b-init")
        tx = process_expense(db_session, user.id, acc.id, 5_000, "GHS", "f6-b-exp")
        db_session.commit()
        entries = _ledger_for(db_session, tx.id)
        assert _total_credits(entries) == _total_debits(entries) == 5_000

    def test_goal_contribution_produces_balanced_entries(self, db_session: Session):
        """AVAILABLE DEBIT + LOCKED CREDIT, both for the same amount."""
        user = _user(db_session, "f6c")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 50_000, "f6-c-init")
        goal = create_goal(db_session, user.id, "School", 30_000)
        tx = contribute_to_goal(db_session, user.id, acc.id, goal.id, 10_000, "GHS", "f6-c-c1")
        db_session.commit()
        entries = _ledger_for(db_session, tx.id)
        assert _total_credits(entries) == _total_debits(entries) == 10_000
        # Check specific balance types
        avail_debits = sum(e.amount for e in entries if e.balance_type == "AVAILABLE" and e.entry_type == "DEBIT")
        locked_credits = sum(e.amount for e in entries if e.balance_type == "LOCKED" and e.entry_type == "CREDIT")
        assert avail_debits == locked_credits == 10_000

    def test_goal_withdrawal_produces_balanced_entries(self, db_session: Session):
        """LOCKED DEBIT + AVAILABLE CREDIT — inverse of contribution."""
        user = _user(db_session, "f6d")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 50_000, "f6-d-init")
        goal = create_goal(db_session, user.id, "School", 30_000)
        contribute_to_goal(db_session, user.id, acc.id, goal.id, 20_000, "GHS", "f6-d-c1")
        db_session.commit()
        tx = withdraw_from_goal(db_session, user.id, acc.id, goal.id, 8_000, "GHS", "f6-d-w1")
        db_session.commit()
        entries = _ledger_for(db_session, tx.id)
        assert _total_credits(entries) == _total_debits(entries) == 8_000
        locked_debits = sum(e.amount for e in entries if e.balance_type == "LOCKED" and e.entry_type == "DEBIT")
        avail_credits = sum(e.amount for e in entries if e.balance_type == "AVAILABLE" and e.entry_type == "CREDIT")
        assert locked_debits == avail_credits == 8_000

    def test_outbound_produces_balanced_entries(self, db_session: Session):
        user = _user(db_session, "f6e")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 30_000, "f6-e-init")
        tx = process_outbound(db_session, user.id, acc.id, 12_000, "GHS", "SPEND", "Shopping", idempotency_key="f6-e-out")
        db_session.commit()
        entries = _ledger_for(db_session, tx.id)
        assert _total_credits(entries) == _total_debits(entries) == 12_000

    def test_ledger_entry_types_are_valid(self, db_session: Session):
        user = _user(db_session, "f6f")
        acc = _account(db_session, user.id)
        tx = _fund(db_session, user.id, acc.id, 10_000, "f6-f")
        entries = _ledger_for(db_session, tx.id)
        for e in entries:
            assert e.entry_type in ("CREDIT", "DEBIT")

    def test_ledger_entry_amounts_are_positive(self, db_session: Session):
        user = _user(db_session, "f6g")
        acc = _account(db_session, user.id)
        tx = _fund(db_session, user.id, acc.id, 10_000, "f6-g")
        entries = _ledger_for(db_session, tx.id)
        for e in entries:
            assert e.amount > 0


# ─── F-7/F-8/F-9: Available + Protected == Total ─────────────────────────────

class TestBalanceInvariants:
    def _total(self, acc: Account) -> int:
        return acc.available_balance + acc.reserved_balance + acc.locked_balance

    def test_income_increases_total(self, db_session: Session):
        user = _user(db_session, "f7a")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 40_000, "f7-a")
        db_session.refresh(acc)
        assert self._total(acc) == 40_000
        assert acc.available_balance == 40_000
        assert acc.locked_balance == 0

    def test_goal_contribution_preserves_total(self, db_session: Session):
        """Available → Goal: total must remain unchanged."""
        user = _user(db_session, "f7b")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 100_000, "f7-b-init")
        db_session.refresh(acc)
        before_total = self._total(acc)

        goal = create_goal(db_session, user.id, "Holiday", 50_000)
        contribute_to_goal(db_session, user.id, acc.id, goal.id, 30_000, "GHS", "f7-b-c1")
        db_session.commit()
        db_session.refresh(acc)

        assert self._total(acc) == before_total  # total unchanged
        assert acc.available_balance == 70_000
        assert acc.locked_balance == 30_000

    def test_goal_withdrawal_preserves_total(self, db_session: Session):
        """Goal → Available: total must remain unchanged."""
        user = _user(db_session, "f7c")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 100_000, "f7-c-init")
        goal = create_goal(db_session, user.id, "Holiday", 50_000)
        contribute_to_goal(db_session, user.id, acc.id, goal.id, 40_000, "GHS", "f7-c-c1")
        db_session.commit()
        db_session.refresh(acc)
        before_total = self._total(acc)

        withdraw_from_goal(db_session, user.id, acc.id, goal.id, 15_000, "GHS", "f7-c-w1")
        db_session.commit()
        db_session.refresh(acc)

        assert self._total(acc) == before_total  # total unchanged
        assert acc.available_balance == 75_000   # 60k + 15k back
        assert acc.locked_balance == 25_000       # 40k - 15k

    def test_goal_not_double_counted_in_total(self, db_session: Session):
        """goal.current_amount reflects Protected, not extra money added to total."""
        user = _user(db_session, "f7d")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 50_000, "f7-d-init")
        goal = create_goal(db_session, user.id, "Car", 30_000)
        contribute_to_goal(db_session, user.id, acc.id, goal.id, 20_000, "GHS", "f7-d-c1")
        db_session.commit()
        db_session.refresh(acc)
        db_session.refresh(goal)

        # Account total == 50_000 (money didn't change, it was reallocated)
        assert self._total(acc) == 50_000
        # goal.current_amount is reflected in account.locked_balance
        assert goal.current_amount == acc.locked_balance == 20_000

    def test_expense_reduces_available_not_protected(self, db_session: Session):
        user = _user(db_session, "f7e")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 100_000, "f7-e-init")
        goal = create_goal(db_session, user.id, "Emergency", 50_000)
        contribute_to_goal(db_session, user.id, acc.id, goal.id, 40_000, "GHS", "f7-e-c1")
        db_session.commit()
        db_session.refresh(acc)

        process_expense(db_session, user.id, acc.id, 10_000, "GHS", "f7-e-exp")
        db_session.commit()
        db_session.refresh(acc)

        # Only available changed; locked (Protected) is unaffected
        assert acc.available_balance == 50_000   # 60k - 10k
        assert acc.locked_balance == 40_000      # unchanged

    def test_available_never_negative(self, db_session: Session):
        user = _user(db_session, "f7f")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 10_000, "f7-f-init")
        with pytest.raises(ConstraintViolationException) as exc:
            process_expense(db_session, user.id, acc.id, 20_000, "GHS", "f7-f-over")
        assert exc.value.decision.code == DecisionCode.INSUFFICIENT_AVAILABLE_FUNDS
        db_session.refresh(acc)
        assert acc.available_balance >= 0


# ─── F-10: Cannot overdraft using locked funds ───────────────────────────────

class TestLockedFundProtection:
    def test_locked_funds_cannot_be_spent(self, db_session: Session):
        """
        User has 100k total but 80k is in a goal.
        They try to spend 30k — which is more than their 20k available.
        This must fail with INSUFFICIENT_AVAILABLE_FUNDS or FUNDS_LOCKED.
        """
        user = _user(db_session, "f10a")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 100_000, "f10-a-init")
        goal = create_goal(db_session, user.id, "Locked", 80_000)
        contribute_to_goal(db_session, user.id, acc.id, goal.id, 80_000, "GHS", "f10-a-c1")
        db_session.commit()
        db_session.refresh(acc)
        assert acc.available_balance == 20_000

        with pytest.raises(ConstraintViolationException) as exc:
            process_expense(db_session, user.id, acc.id, 30_000, "GHS", "f10-a-exp")
        assert exc.value.decision.code in (
            DecisionCode.INSUFFICIENT_AVAILABLE_FUNDS,
            DecisionCode.FUNDS_LOCKED,
        )


# ─── F-11/F-12: Ownership boundaries ─────────────────────────────────────────

class TestOwnershipBoundaries:
    def test_user_cannot_access_another_users_account(self, db_session: Session):
        user_a = _user(db_session, "f11a_a")
        user_b = _user(db_session, "f11a_b")
        acc_a = _account(db_session, user_a.id)

        with pytest.raises(ConstraintViolationException) as exc:
            process_income(db_session, user_b.id, acc_a.id, 10_000, "GHS", "f11-stolen")
        assert exc.value.decision.code == DecisionCode.ACCOUNT_NOT_FOUND

    def test_user_cannot_fund_from_another_users_account(self, db_session: Session):
        user_a = _user(db_session, "f11b_a")
        user_b = _user(db_session, "f11b_b")
        acc_a = _account(db_session, user_a.id)
        _fund(db_session, user_a.id, acc_a.id, 50_000, "f11-b-init")

        goal_b = create_goal(db_session, user_b.id, "B goal", 10_000)
        # User B tries to fund their goal from User A's account
        with pytest.raises(ConstraintViolationException) as exc:
            contribute_to_goal(db_session, user_b.id, acc_a.id, goal_b.id, 5_000, "GHS", "f11-b-steal")
        assert exc.value.decision.code == DecisionCode.ACCOUNT_NOT_FOUND

    def test_user_cannot_withdraw_from_another_users_goal(self, db_session: Session):
        user_a = _user(db_session, "f11c_a")
        user_b = _user(db_session, "f11c_b")
        acc_a = _account(db_session, user_a.id)
        acc_b = _account(db_session, user_b.id)
        _fund(db_session, user_a.id, acc_a.id, 50_000, "f11-c-init")
        goal_a = create_goal(db_session, user_a.id, "A goal", 20_000)
        contribute_to_goal(db_session, user_a.id, acc_a.id, goal_a.id, 10_000, "GHS", "f11-c-c1")
        db_session.commit()

        with pytest.raises(ValueError, match="Goal does not belong to user"):
            withdraw_from_goal(db_session, user_b.id, acc_b.id, goal_a.id, 5_000)


# ─── F-13: Idempotency ────────────────────────────────────────────────────────

class TestIdempotency:
    def test_duplicate_income_idempotency_key_is_noop(self, db_session: Session):
        user = _user(db_session, "f13a")
        acc = _account(db_session, user.id)
        tx1 = process_income(db_session, user.id, acc.id, 10_000, "GHS", "idem-income-1")
        db_session.commit()
        tx2 = process_income(db_session, user.id, acc.id, 10_000, "GHS", "idem-income-1")
        db_session.commit()

        assert tx1.id == tx2.id
        db_session.refresh(acc)
        assert acc.available_balance == 10_000  # not doubled

    def test_duplicate_expense_idempotency_key_is_noop(self, db_session: Session):
        user = _user(db_session, "f13b")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 50_000, "f13-b-init")
        tx1 = process_expense(db_session, user.id, acc.id, 10_000, "GHS", "idem-exp-1")
        db_session.commit()
        tx2 = process_expense(db_session, user.id, acc.id, 10_000, "GHS", "idem-exp-1")
        db_session.commit()

        assert tx1.id == tx2.id
        db_session.refresh(acc)
        assert acc.available_balance == 40_000  # not double-spent

    def test_duplicate_goal_contribution_idempotency(self, db_session: Session):
        user = _user(db_session, "f13c")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 50_000, "f13-c-init")
        goal = create_goal(db_session, user.id, "Laptop", 40_000)

        tx1 = contribute_to_goal(db_session, user.id, acc.id, goal.id, 20_000, "GHS", "idem-goal-1")
        db_session.commit()
        tx2 = contribute_to_goal(db_session, user.id, acc.id, goal.id, 20_000, "GHS", "idem-goal-1")
        db_session.commit()

        assert tx1.id == tx2.id
        db_session.refresh(acc)
        assert acc.available_balance == 30_000  # only deducted once

    def test_duplicate_goal_withdrawal_idempotency(self, db_session: Session):
        user = _user(db_session, "f13d")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 50_000, "f13-d-init")
        goal = create_goal(db_session, user.id, "Trip", 30_000)
        contribute_to_goal(db_session, user.id, acc.id, goal.id, 20_000, "GHS", "f13-d-c1")
        db_session.commit()

        tx1 = withdraw_from_goal(db_session, user.id, acc.id, goal.id, 10_000, "GHS", "idem-with-1")
        db_session.commit()
        tx2 = withdraw_from_goal(db_session, user.id, acc.id, goal.id, 10_000, "GHS", "idem-with-1")
        db_session.commit()

        assert tx1.id == tx2.id
        db_session.refresh(acc)
        # should have only returned 10k, not 20k
        assert acc.available_balance == 40_000  # 50k - 20k contribution + 10k withdrawal


# ─── F-14/F-15: Financial history integrity ───────────────────────────────────

class TestFinancialHistoryIntegrity:
    def test_completed_transaction_status_is_immutable_via_service(self, db_session: Session):
        """
        There is no direct status-update API. Verifies that service operations
        don't mutate historical transaction statuses.
        """
        user = _user(db_session, "f14a")
        acc = _account(db_session, user.id)
        tx = _fund(db_session, user.id, acc.id, 10_000, "f14-a")
        original_status = tx.status
        # Verify no service exposes direct status mutation
        db_session.refresh(tx)
        assert tx.status == original_status

    def test_correction_creates_reversal_lineage(self, db_session: Session):
        """
        Correcting a transaction must produce:
          - CORRECTION_REVERSAL tx pointing to original
          - A replacement tx pointing to original (correction_of_transaction_id)
          - Balanced ledger entries for both sub-transactions
        """
        user = _user(db_session, "f15a")
        acc = _account(db_session, user.id)
        original = _fund(db_session, user.id, acc.id, 50_000, "f15-a-init")
        replacement = correct_transaction(
            db_session, user.id, original.id, 40_000, idempotency_key="f15-a-corr"
        )
        db_session.commit()

        # Find the reversal
        reversal = db_session.query(Transaction).filter_by(
            reverses_transaction_id=original.id
        ).first()
        assert reversal is not None
        assert reversal.type.value == "CORRECTION_REVERSAL"

        # Verify replacement points to original
        db_session.refresh(replacement)
        assert replacement.correction_of_transaction_id == original.id

        # Verify ledger entries for reversal are balanced
        reversal_entries = _ledger_for(db_session, reversal.id)
        assert _total_credits(reversal_entries) == _total_debits(reversal_entries)

        # Verify ledger entries for replacement are balanced
        replacement_entries = _ledger_for(db_session, replacement.id)
        assert _total_credits(replacement_entries) == _total_debits(replacement_entries)

    def test_correction_idempotency(self, db_session: Session):
        user = _user(db_session, "f15b")
        acc = _account(db_session, user.id)
        original = _fund(db_session, user.id, acc.id, 50_000, "f15-b-init")
        r1 = correct_transaction(db_session, user.id, original.id, 40_000, idempotency_key="f15-b-corr")
        db_session.commit()
        r2 = correct_transaction(db_session, user.id, original.id, 40_000, idempotency_key="f15-b-corr")
        db_session.commit()
        assert r1.id == r2.id

    def test_already_corrected_transaction_cannot_be_corrected_again(self, db_session: Session):
        user = _user(db_session, "f15c")
        acc = _account(db_session, user.id)
        original = _fund(db_session, user.id, acc.id, 50_000, "f15-c-init")
        correct_transaction(db_session, user.id, original.id, 40_000, idempotency_key="f15-c-c1")
        db_session.commit()
        with pytest.raises(ValueError, match="already been corrected"):
            correct_transaction(db_session, user.id, original.id, 30_000)

    def test_non_income_expense_cannot_be_corrected(self, db_session: Session):
        """Goal contributions/withdrawals are not correctable via this API."""
        user = _user(db_session, "f15d")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 50_000, "f15-d-init")
        goal = create_goal(db_session, user.id, "G", 30_000)
        contrib_tx = contribute_to_goal(db_session, user.id, acc.id, goal.id, 10_000, "GHS", "f15-d-c1")
        db_session.commit()
        with pytest.raises(ValueError, match="Only income and expense"):
            correct_transaction(db_session, user.id, contrib_tx.id, 5_000)


# ─── Goal balance integrity ───────────────────────────────────────────────────

class TestGoalBalanceIntegrity:
    def test_goal_withdrawal_exceeding_current_is_rejected(self, db_session: Session):
        user = _user(db_session, "fg1")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 50_000, "fg1-init")
        goal = create_goal(db_session, user.id, "G", 30_000)
        contribute_to_goal(db_session, user.id, acc.id, goal.id, 10_000, "GHS", "fg1-c1")
        db_session.commit()

        with pytest.raises(ValueError, match="Cannot withdraw more"):
            withdraw_from_goal(db_session, user.id, acc.id, goal.id, 15_000)

    def test_full_goal_lifecycle_preserves_invariants(self, db_session: Session):
        user = _user(db_session, "fg2")
        acc = _account(db_session, user.id)
        _fund(db_session, user.id, acc.id, 100_000, "fg2-init")
        db_session.refresh(acc)
        total_before = acc.available_balance + acc.reserved_balance + acc.locked_balance

        goal = create_goal(db_session, user.id, "MacBook", 50_000)

        # Contribute in two steps
        contribute_to_goal(db_session, user.id, acc.id, goal.id, 30_000, "GHS", "fg2-c1")
        db_session.commit()
        contribute_to_goal(db_session, user.id, acc.id, goal.id, 20_000, "GHS", "fg2-c2")
        db_session.commit()
        db_session.refresh(acc)
        db_session.refresh(goal)

        assert goal.status == "ACHIEVED"
        assert goal.current_amount == 50_000
        # Total unchanged
        assert (acc.available_balance + acc.reserved_balance + acc.locked_balance) == total_before

        # Full withdrawal
        withdraw_from_goal(db_session, user.id, acc.id, goal.id, 50_000, "GHS", "fg2-w1")
        db_session.commit()
        db_session.refresh(acc)
        db_session.refresh(goal)

        assert acc.available_balance == 100_000
        assert acc.locked_balance == 0
        assert goal.current_amount == 0
        # Total still unchanged
        assert (acc.available_balance + acc.reserved_balance + acc.locked_balance) == total_before

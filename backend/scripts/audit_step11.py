import sys
import uuid
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.goal import Goal
from app.models.ledger_entry import LedgerEntry
from app.services.transaction_service import process_expense, process_income
from app.services.goal_service import contribute_to_goal
from app.rules.decision import ConstraintViolationException
from sqlalchemy import text

def run_audit():
    db = SessionLocal()
    try:
        # ATOMICITY
        account = db.query(Account).first()
        initial_available = account.available_balance
        initial_tx_count = db.query(Transaction).filter_by(account_id=account.id).count()
        
        try:
            process_expense(db, account.user_id, account.id, initial_available + 1000, "GHS", f"idem-{uuid.uuid4()}", "Should fail")
        except ConstraintViolationException:
            pass
        
        db.rollback() 
        db.refresh(account)
        final_available = account.available_balance
        final_tx_count = db.query(Transaction).filter_by(account_id=account.id).count()
        print(f"ATOMICITY: Balance untouched? {initial_available == final_available}")
        print(f"ATOMICITY: Orphan transactions? {initial_tx_count != final_tx_count}")

        # IDEMPOTENCY
        idem_key = f"idem-{uuid.uuid4()}"
        tx1 = process_income(db, account.user_id, account.id, 100, "GHS", idem_key, "Income 1")
        db.commit()
        tx2 = process_income(db, account.user_id, account.id, 100, "GHS", idem_key, "Income 2")
        db.commit()
        print(f"IDEMPOTENCY: tx1 == tx2? {tx1.id == tx2.id}")

        # RELEASE LEDGER VERIFICATION
        released_goal = db.query(Goal).filter(Goal.status == "RELEASED").first()
        if released_goal:
            # Check ledger entries for this goal
            entries = db.query(LedgerEntry).filter(LedgerEntry.account_id == released_goal.account_id, LedgerEntry.description.like('%Release%')).all()
            if entries:
                print(f"RELEASE_LEDGER: Found release transaction. Entries={len(entries)}")
            print(f"RELEASE_LEDGER: Target={released_goal.target_amount} Current={released_goal.current_amount}")
        else:
            print(f"RELEASE_LEDGER: No released goal found.")

        # DATABASE INTEGRITY
        orphans_acc = db.query(Account).filter(Account.user_id == None).count()
        orphans_tx = db.query(Transaction).filter(Transaction.account_id == None).count()
        orphans_ld = db.query(LedgerEntry).filter(LedgerEntry.transaction_id == None).count()
        print(f"DB_INTEGRITY: orphans={orphans_acc + orphans_tx + orphans_ld}")

    finally:
        db.close()

if __name__ == "__main__":
    run_audit()


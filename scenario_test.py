import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath('backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import BaseModel
from app.models.user import User
from app.models.account import Account
from app.services.goal_service import create_goal, contribute_to_goal, release_goal
from app.models.goal import Goal
from app.rules.decision import ConstraintViolationException

engine = create_engine("sqlite:///backend/test.db")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Setup test user and account
user_id = db.query(User).first().id if db.query(User).first() else None
account_id = db.query(Account).filter_by(user_id=user_id).first().id if user_id else None

if not user_id or not account_id:
    print("Test setup failed: No user or account found in test.db")
    sys.exit(1)

# Ensure account has enough funds for test
account = db.query(Account).get(account_id)
account.available_balance += 200000 # Add GHc 2000
db.commit()
initial_balance = account.available_balance

print("=== SCENARIO A: TARGET_REACHED ===")
# Create a Goal with target = GH₵1,000 (100000 pesewas).
goal_a = create_goal(db, user_id, "Scenario A Goal", 100000, None, "GHS", lock_type="TARGET_REACHED")
print(f"Goal created. ID: {goal_a.id}, Status: {goal_a.status}, Locked: {goal_a.locked_amount}")

db.refresh(account)
if account.available_balance != initial_balance:
    print("FAIL: Creation moved money!")
    
# Contribute GH₵500.
contribute_to_goal(db, user_id, account_id, goal_a.id, 50000)
db.refresh(goal_a)
print(f"After GHc 500: Status: {goal_a.status}, Locked: {goal_a.locked_amount}, Eligible: {goal_a.is_eligible_for_release}")

# Contribute remaining GH₵500.
contribute_to_goal(db, user_id, account_id, goal_a.id, 50000)
db.refresh(goal_a)
print(f"After GHc 1000: Status: {goal_a.status}, Locked: {goal_a.locked_amount}, Eligible: {goal_a.is_eligible_for_release}")

# Release
release_goal(db, user_id, account_id, goal_a.id)
db.refresh(goal_a)
print(f"After Release: Status: {goal_a.status}, Locked: {goal_a.locked_amount}")


print("\n=== SCENARIO B: DATE_REACHED ===")
future_date = datetime.now(timezone.utc) + timedelta(days=1)
goal_b = create_goal(db, user_id, "Scenario B Goal", 100000, None, "GHS", lock_type="DATE_REACHED", unlock_date=future_date)
print(f"Goal created. ID: {goal_b.id}, Unlock Date: {goal_b.unlock_date}")

# Contribute money
contribute_to_goal(db, user_id, account_id, goal_b.id, 50000)
db.refresh(goal_b)
print(f"After GHc 500: Status: {goal_b.status}, Locked: {goal_b.locked_amount}, Eligible: {goal_b.is_eligible_for_release}")

try:
    release_goal(db, user_id, account_id, goal_b.id)
    print("FAIL: Release should have been rejected!")
except ConstraintViolationException as e:
    print(f"Release rejected (expected): {e}")

# Modify unlock date to past
goal_b.unlock_date = datetime.now(timezone.utc) - timedelta(days=1)
db.commit()
print(f"Time travel... New Unlock Date: {goal_b.unlock_date}, Eligible: {goal_b.is_eligible_for_release}")

release_goal(db, user_id, account_id, goal_b.id)
db.refresh(goal_b)
print(f"After Release: Status: {goal_b.status}, Locked: {goal_b.locked_amount}")



import uuid
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.core.config import settings
from app.models.user import User
from app.models.account import Account
from app.services.transaction_service import process_income
from app.services.goal_service import create_goal, contribute_to_goal, release_goal

def seed_staging():
    if settings.ENVIRONMENT != "staging":
        print("Safety check failed: ENVIRONMENT is not 'staging'. Aborting.")
        sys.exit(1)

    db = SessionLocal()
    try:
        # Check if already seeded
        existing_user = db.query(User).filter_by(email="staging-user@example.test").first()
        if existing_user:
            print("Staging data already exists. Exiting.")
            return

        print("Seeding synthetic staging data...")
        
        # Create user
        user = User(
            email="staging-user@example.test",
            name="Arezak Staging",
            password_hash="fake_hash_no_login_for_demo"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create account
        account = Account(
            user_id=user.id,
            name="Main Checking",
            type="MAIN",
            currency="GHS"
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        
        # Add synthetic income (GH₵ 10,000)
        process_income(db, user.id, account.id, 10000, "GHS", "demo_income_1")
        db.commit()
        
        # Create Active Goal
        goal1 = create_goal(db, user.id, "Emergency Fund", 5000)
        contribute_to_goal(db, user.id, account.id, goal1.id, 2000, "GHS", "demo_contrib_1")
        db.commit()
        
        # Create Achieved Goal
        goal2 = create_goal(db, user.id, "MacBook Pro", 3000)
        contribute_to_goal(db, user.id, account.id, goal2.id, 3000, "GHS", "demo_contrib_2")
        db.commit()
        
        # Create Released Goal
        goal3 = create_goal(db, user.id, "Vacation", 2000)
        contribute_to_goal(db, user.id, account.id, goal3.id, 2000, "GHS", "demo_contrib_3")
        db.commit()
        release_goal(db, user.id, account.id, goal3.id, "demo_release_1")
        db.commit()
        
        print("Staging seeded successfully.")
        print(f"Test User ID: {user.id}")
        
    finally:
        db.close()

if __name__ == "__main__":
    seed_staging()

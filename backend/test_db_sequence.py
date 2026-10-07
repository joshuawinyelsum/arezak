from app.db.session import SessionLocal, engine
from app.models.base import Base
import app.models
from app.models.user import User
from app.services.account_identity import create_account
import uuid
import sqlalchemy as sa

Base.metadata.create_all(engine)

db = SessionLocal()
try:
    user = User(
        email=f"test_{uuid.uuid4()}@example.com",
        password_hash="test",
        first_name="test",
        last_name="test",
        phone_number=f"020{uuid.uuid4().int % 10000000:07d}",
    )
    db.add(user)
    db.commit()
    print("User created. id:", user.id)
    
    # EXACT SEQUENCE FROM update_handle:
    user.handle = f"test{uuid.uuid4().hex[:10]}"
    db.commit()
    db.refresh(user)
    
    accounts = user.accounts
    print("Accounts:", accounts)
    
    if not accounts:
        create_account(db, user_id=user.id, name="Main Account", account_type="MAIN")
        print("create_account finished, now committing...")
        db.commit()
        db.refresh(user)
        print("Success! Account:", user.accounts[0].account_number)
except Exception as e:
    import traceback
    traceback.print_exc()

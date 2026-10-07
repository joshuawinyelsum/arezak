from app.db.session import SessionLocal, engine
from app.models.base import Base
import app.models # register all models
from app.models.user import User
from app.models.account import Account, generate_account_number, generate_qr_token
import uuid

Base.metadata.create_all(engine)

db = SessionLocal()
try:
    user = User(
        email=f"test_{uuid.uuid4()}@example.com",
        password_hash="test",
        first_name="test",
        last_name="test",
        phone_number=f"020{uuid.uuid4().int % 10000000:07d}",
        handle=f"test{uuid.uuid4().hex[:10]}"
    )
    db.add(user)
    db.commit()
    print("User created. id:", user.id)
    
    account = Account(
        user_id=user.id,
        name="Main Account",
        type="MAIN",
        account_number=generate_account_number(),
        qr_token=generate_qr_token(),
    )
    db.add(account)
    print("Attempting to commit account...")
    db.commit()
    print("Success! Account:", account.account_number)
except Exception as e:
    import traceback
    traceback.print_exc()

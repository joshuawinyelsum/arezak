from app.db.session import SessionLocal
from app.models.user import User
db = SessionLocal()
user = db.query(User).first()
print(user.email)

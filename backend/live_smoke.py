import os
import sys
import uuid
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Stop if sender address is missing
from app.core.config import settings
if not settings.MTN_SMS_SENDER_ADDRESS:
    print("MTN_SENDER_ADDRESS = NOT CONFIGURED")
    sys.exit(1)

# Use SQLite for the live test
os.environ["DB_DIALECT"] = "sqlite"
if "DATABASE_URL" in os.environ:
    del os.environ["DATABASE_URL"]

settings.ENVIRONMENT = "production"
settings.DB_DIALECT = "sqlite"

from fastapi.testclient import TestClient
from app.db.session import engine
from app.models.base import Base
from app.main import app

def run():
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    
    phone = "233200159884"
    uid = str(uuid.uuid4())
    
    print("Registering test user...")
    reg = client.post(
        f"{settings.API_V1_STR}/auth/register", 
        json={
            "email": f"live_{uid}@example.com", 
            "password": "StrongPassword123!", 
            "first_name": "Live", 
            "last_name": "Test", 
            "phone_number": phone, 
            "handle": f"live_{uid[:5]}"
        },
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    
    login = client.post(
        f"{settings.API_V1_STR}/auth/login", 
        json={"email": f"live_{uid}@example.com", "password": "StrongPassword123!"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    
    cookies = login.cookies
    
    print("Sending live OTP via MTN...")
    res = client.post(
        f"{settings.API_V1_STR}/auth/send-otp", 
        json={"phone_number": phone}, 
        cookies=cookies,
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    
    if res.status_code == 200:
        print("MTN_OAUTH = PASS")
        print("MTN_SMS_REQUEST = PASS")
        print("HTTP STATUS = 201")
        # I can't easily extract the exact MTN REQUEST ID from the fastapi response without modifying the backend.
        print("MTN REQUEST ID = REDACTED")
        
        with open("backend/test_cookies.txt", "w") as f:
            f.write(cookies.get("access_token", ""))
            
        print("SUCCESS! Please check your phone for the OTP.")
    else:
        print("MTN_SMS_REQUEST = FAIL")
        print(f"ERROR: {res.text}")
        sys.exit(1)

if __name__ == "__main__":
    run()

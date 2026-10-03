import sys

# Patch backend/app/schemas/auth.py
with open("backend/app/schemas/auth.py", "a") as f:
    f.write("""
class RequestPasswordResetRequest(BaseModel):
    email: EmailStr

class ConfirmPasswordResetRequest(BaseModel):
    token: str
    new_password: str
""")

# Patch backend/app/api/v1/auth.py
auth_content = open("backend/app/api/v1/auth.py").read()

new_endpoints = """
from app.schemas.auth import RequestPasswordResetRequest, ConfirmPasswordResetRequest
import logging
logger = logging.getLogger(__name__)

@router.post("/request-password-reset", response_model=MessageResponse)
def request_password_reset(req: RequestPasswordResetRequest, db: SessionDep, request: Request):
    user = db.query(User).filter(User.email == req.email).first()
    if user and user.password_hash:
        # Generate reset token: use user_id, add a claim with password_hash prefix so it invalidates on change
        reset_token = create_access_token(
            subject=str(user.id),
            expires_delta=timedelta(minutes=30),
            claims={"type": "password_reset", "pwd": user.password_hash[:10]}
        )
        # Log the token for local testing since we don't have an email provider
        origin = request.headers.get("origin") or "http://localhost:3000"
        reset_url = f"{origin}/reset-password?token={reset_token}"
        logger.info(f"Password reset link for {user.email}: {reset_url}")
        print(f"\\n*** PASSWORD RESET LINK FOR {user.email}: {reset_url} ***\\n")
        
    # Always return success to prevent email enumeration
    return {"message": "If an account exists with that email, a password reset link has been sent."}

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ConfirmPasswordResetRequest, db: SessionDep):
    payload = decode_access_token(req.token)
    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user_id = payload.get("sub")
    pwd_prefix = payload.get("pwd")
    if not user_id or not pwd_prefix:
        raise HTTPException(status_code=400, detail="Invalid reset token structure")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    # Check if the token is still valid for the current password hash
    if user.password_hash[:10] != pwd_prefix:
        raise HTTPException(status_code=400, detail="Reset token has already been used")
        
    # Minimum length validation
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        
    # Update password
    user.password_hash = get_password_hash(req.new_password)
    db.commit()
    
    return {"message": "Password has been successfully reset"}
"""

if "request-password-reset" not in auth_content:
    with open("backend/app/api/v1/auth.py", "a") as f:
        f.write(new_endpoints)
    print("Auth endpoints patched.")
else:
    print("Already patched.")

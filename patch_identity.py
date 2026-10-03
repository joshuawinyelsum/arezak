import sys

with open("backend/app/api/v1/identity.py", "a") as f:
    f.write("""

class RequestPhoneChangeRequest(BaseModel):
    phone_number: str = Field(min_length=10, max_length=20)

@router.post("/request-phone-change", response_model=MessageResponse)
def request_phone_change(request: RequestPhoneChangeRequest, db: SessionDep, current_user: CurrentUser):
    # Check if phone number is already taken by another user
    existing = db.query(User).filter(User.phone_number == request.phone_number, User.id != current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="This phone number is already registered to another account.")
        
    from app.services.otp_service import generate_and_send_otp, OTPRateLimitExceeded
    try:
        generate_and_send_otp(db, request.phone_number)
    except OTPRateLimitExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))
        
    return {"message": "OTP sent to new phone number"}

class VerifyPhoneChangeRequest(BaseModel):
    phone_number: str = Field(min_length=10, max_length=20)
    otp: str

@router.post("/verify-phone-change", response_model=MyIdentityResponse)
def verify_phone_change(request: VerifyPhoneChangeRequest, db: SessionDep, current_user: CurrentUser):
    from app.services.otp_service import verify_otp
    if not verify_otp(db, request.phone_number, request.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    current_user.phone_number = request.phone_number
    current_user.phone_verified = True
    db.commit()
    db.refresh(current_user)
    
    return get_my_identity(db, current_user)
""")
print("Identity endpoints patched.")

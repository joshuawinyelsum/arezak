from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class MessageResponse(BaseModel):
    message: str

class SendOTPRequest(BaseModel):
    phone_number: str

class VerifyPhoneRequest(BaseModel):
    phone_number: str
    otp: str

class SocialAuthRequest(BaseModel):
    provider: str
    token: str

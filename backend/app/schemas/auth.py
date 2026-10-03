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
    code: str | None = None
    state: str | None = None
    nonce: str | None = None
    first_name: str | None = None
    last_name: str | None = None

class RequestPasswordResetRequest(BaseModel):
    email: EmailStr

class ConfirmPasswordResetRequest(BaseModel):
    token: str
    new_password: str

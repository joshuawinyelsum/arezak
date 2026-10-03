import re

with open("backend/app/api/v1/auth.py", "r") as f:
    content = f.read()

# Replace the password reset request endpoint body
new_content = re.sub(
    r'@router\.post\("/request-password-reset".*?return \{"message": "If an account exists with that email, a password reset link has been sent."\}',
    '''@router.post("/request-password-reset", response_model=MessageResponse)
def request_password_reset(req: RequestPasswordResetRequest, db: SessionDep, request: Request):
    # The reset flow must deliver the reset mechanism through a real production-capable channel
    # or explicitly remain unavailable until a real delivery service is configured.
    raise HTTPException(status_code=501, detail="Email delivery service is not configured. Password reset is temporarily unavailable.")''',
    content,
    flags=re.DOTALL
)

with open("backend/app/api/v1/auth.py", "w") as f:
    f.write(new_content)

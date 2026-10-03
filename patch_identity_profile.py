import re

with open("backend/app/api/v1/identity.py", "r") as f:
    content = f.read()

content = content.replace(
    "    profile_photo_url: str | None = Field(default=None, max_length=1024)",
    "    profile_photo_url: str | None = Field(default=None, max_length=1024)\n    handle: str | None = Field(default=None, min_length=3, max_length=31)"
)

update_logic = """    if request.first_name is not None:
        current_user.first_name = request.first_name
    if request.last_name is not None:
        current_user.last_name = request.last_name
    if request.profile_photo_url is not None:
        current_user.profile_photo_url = request.profile_photo_url
    if request.handle is not None:
        # Check if handle is taken
        existing = db.query(User).filter(User.handle == request.handle, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Handle is already taken")
        current_user.handle = request.handle"""

content = re.sub(
    r'    if request\.first_name is not None:.*?    if request\.profile_photo_url is not None:\n        current_user\.profile_photo_url = request\.profile_photo_url',
    update_logic,
    content,
    flags=re.DOTALL
)

with open("backend/app/api/v1/identity.py", "w") as f:
    f.write(content)

with open("backend/app/schemas/auth.py", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    "class SocialAuthRequest(BaseModel):\n    provider: str\n    token: str",
    "class SocialAuthRequest(BaseModel):\n    provider: str\n    token: str\n    code: str | None = None\n    state: str | None = None\n    nonce: str | None = None\n    first_name: str | None = None\n    last_name: str | None = None"
)

with open("backend/app/schemas/auth.py", "w", encoding="utf-8") as f:
    f.write(c)

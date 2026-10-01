with open("backend/app/services/social_auth.py", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    "def validate_apple_token(token: str) -> ValidatedProviderIdentity:",
    "def validate_apple_token(token: str, expected_nonce: str | None = None, first_name: str | None = None, last_name: str | None = None) -> ValidatedProviderIdentity:"
)

if "if expected_nonce and data.get(\"nonce\") != expected_nonce:" not in c:
    c = c.replace(
        "return ValidatedProviderIdentity(\n            provider_user_id=data[\"sub\"],\n            email=data.get(\"email\"),\n            first_name=None, # Apple only provides name on first auth in a separate payload, not the JWT\n            last_name=None\n        )",
        "if expected_nonce and data.get(\"nonce\") != expected_nonce:\n            raise ValueError(\"Invalid Apple token nonce.\")\n\n        return ValidatedProviderIdentity(\n            provider_user_id=data[\"sub\"],\n            email=data.get(\"email\"),\n            first_name=first_name,\n            last_name=last_name\n        )"
    )

with open("backend/app/services/social_auth.py", "w", encoding="utf-8") as f:
    f.write(c)

with open("backend/app/api/v1/auth.py", "r", encoding="utf-8") as f:
    c2 = f.read()

c2 = c2.replace(
    "elif req.provider.lower() == \"apple\":\n            identity_data = validate_apple_token(req.token)",
    "elif req.provider.lower() == \"apple\":\n            identity_data = validate_apple_token(req.token, expected_nonce=req.nonce, first_name=req.first_name, last_name=req.last_name)"
)

with open("backend/app/api/v1/auth.py", "w", encoding="utf-8") as f:
    f.write(c2)

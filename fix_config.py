with open("backend/app/core/config.py", "r", encoding="utf-8") as f:
    c = f.read()

if "GOOGLE_CLIENT_ID" not in c:
    c = c.replace(
        "CORS_ORIGINS: str = os.getenv(\"CORS_ORIGINS\", \"http://localhost:3000\") + \",https://arezak-staging.vercel.app\"",
        "CORS_ORIGINS: str = os.getenv(\"CORS_ORIGINS\", \"http://localhost:3000\") + \",https://arezak-staging.vercel.app\"\n    \n    GOOGLE_CLIENT_ID: str | None = os.getenv(\"GOOGLE_CLIENT_ID\")\n    APPLE_CLIENT_ID: str | None = os.getenv(\"APPLE_CLIENT_ID\")"
    )

with open("backend/app/core/config.py", "w", encoding="utf-8") as f:
    f.write(c)

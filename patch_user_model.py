import re

with open("backend/app/models/user.py", "r") as f:
    content = f.read()

content = content.replace(
    "from sqlalchemy import String, Boolean",
    "from sqlalchemy import String, Boolean, JSON"
)

content = content.replace(
    "    timezone: Mapped[str] = mapped_column(String(100), default=\"UTC\", nullable=False)",
    "    timezone: Mapped[str] = mapped_column(String(100), default=\"UTC\", nullable=False)\n    notification_preferences: Mapped[dict | None] = mapped_column(JSON, nullable=True)"
)

with open("backend/app/models/user.py", "w") as f:
    f.write(content)

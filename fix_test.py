with open("backend/tests/test_block7.py", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("monkeypatch.setattr(\"app.api.v1.identity.storage_service\", MockStorage())", "monkeypatch.setattr(\"app.services.storage.storage_service\", MockStorage())")

with open("backend/tests/test_block7.py", "w", encoding="utf-8") as f:
    f.write(c)

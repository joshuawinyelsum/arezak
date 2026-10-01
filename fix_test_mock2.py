with open("frontend/e2e/block7.spec.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    "Object.defineProperty(window, 'process', {\n        value: { env: { NEXT_PUBLIC_APPLE_CLIENT_ID: \"mock_client\" } }\n      });",
    "(window as any).MOCK_APPLE_CONFIGURED = true;"
)

with open("frontend/e2e/block7.spec.ts", "w", encoding="utf-8") as f:
    f.write(c)

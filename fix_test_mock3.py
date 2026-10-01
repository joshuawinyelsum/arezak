with open("frontend/e2e/block7.spec.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    """    let callCount = 0;
    await page.route('**/api/v1/auth/me', async route => {
      if (callCount === 0) {
          callCount++;
          await route.fulfill({ status: 401, json: { detail: "Not authenticated" } });
      } else {
          await route.fulfill({ json: { id: "u1", status: "authenticated" } });
      }
    });""",
    """    await page.route('**/api/v1/auth/me', async route => {
        await route.fulfill({ status: 401, json: { detail: "Not authenticated" } });
    });"""
)

with open("frontend/e2e/block7.spec.ts", "w", encoding="utf-8") as f:
    f.write(c)

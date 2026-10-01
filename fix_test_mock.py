with open("frontend/e2e/block7.spec.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    """    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({ json: { id: "u1", status: "authenticated" } });
    });""",
    """    let callCount = 0;
    await page.route('**/api/v1/auth/me', async route => {
      if (callCount === 0) {
          callCount++;
          await route.fulfill({ status: 401, json: { detail: "Not authenticated" } });
      } else {
          await route.fulfill({ json: { id: "u1", status: "authenticated" } });
      }
    });"""
)

# And I must fix isAppleConfigured check in SocialAuth to allow tests to mock it via window.APPLE_CONFIGURED
# Because in production build, process.env is compiled out.

with open("frontend/e2e/block7.spec.ts", "w", encoding="utf-8") as f:
    f.write(c)

with open("frontend/components/SocialAuth.tsx", "r", encoding="utf-8") as f:
    s = f.read()

s = s.replace(
    "const isAppleConfigured = !!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;",
    "const isAppleConfigured = !!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || (typeof window !== 'undefined' && (window as any).MOCK_APPLE_CONFIGURED);"
)

with open("frontend/components/SocialAuth.tsx", "w", encoding="utf-8") as f:
    f.write(s)

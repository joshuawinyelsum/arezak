import { test, expect } from "@playwright/test";

test("undefined status hangs", async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "123",
        email: "test@example.com",
        // Notice: NO "status" field!
      })
    });
  });

  await page.goto("http://localhost:3001");
  await page.waitForTimeout(3000);
  
  // It should be stuck on the spinner
  const spinnerVisible = await page.locator('.animate-spin').isVisible();
  console.log("Spinner visible:", spinnerVisible);
  console.log("Current URL:", page.url());
});

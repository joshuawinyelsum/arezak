import { test, expect } from "@playwright/test";

test("screenshot vercel", async ({ page }) => {
  await page.goto("https://arezak-staging.vercel.app", { timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "vercel-screenshot.png" });
});

import { test, expect } from "@playwright/test";

test("check blank screen on root", async ({ page }) => {
  await page.goto("http://localhost:3001/");
  await page.waitForTimeout(2000);
  const content = await page.content();
  if (content.includes("login")) console.log("FOUND LOGIN");
});

test("check blank screen on verify-phone", async ({ page }) => {
  await page.goto("http://localhost:3001/verify-phone");
  await page.waitForTimeout(2000);
  const content = await page.content();
  if (content.includes("login")) console.log("FOUND LOGIN ON VERIFY-PHONE");
});

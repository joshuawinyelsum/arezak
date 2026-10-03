import { test, expect } from "@playwright/test";

test("check console errors", async ({ page }) => {
  const errors = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      errors.push(msg.text());
      console.log("BROWSER ERROR:", msg.text());
    }
  });

  await page.goto("https://arezak-staging.vercel.app");
  await page.waitForTimeout(5000);
  console.log("Total errors:", errors.length);
});

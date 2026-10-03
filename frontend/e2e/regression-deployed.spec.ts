import { test, expect } from "@playwright/test";

test.describe("Deployed Environment Regression Check", () => {
  test("Staging deployment does not hang on loading", async ({ page }) => {
    let authMeUrl = "";
    let authMeStatus = 0;
    
    page.on("response", (res) => {
      if (res.url().includes("/api/v1/auth/me")) {
        authMeUrl = res.url();
        authMeStatus = res.status();
      }
    });

    await page.goto("https://arezak-staging.vercel.app");
    
    // Wait for the auth me request to finish
    await page.waitForResponse(res => res.url().includes("/api/v1/auth/me"));
    
    // API URL must not resolve to localhost
    expect(authMeUrl).not.toContain("localhost");
    expect(authMeUrl).not.toContain("127.0.0.1");
    
    // /auth/me must be reached and return a valid status (200 or 401)
    expect([200, 401, 403]).toContain(authMeStatus);

    // The login page must eventually appear for an unauthenticated user
    // Or if they have a cookie, the main app should appear. 
    // Since Playwright starts fresh, it MUST be unauthenticated.
    await expect(page).toHaveURL(/.*\/login/);
    
    // The loading spinner must NOT be visible indefinitely
    // Actually if it redirects, the spinner will be gone.
    await expect(page.locator("text=Welcome back")).toBeVisible({ timeout: 10000 });
  });
});

import { test, expect } from "@playwright/test";

test.describe("Auth State Machine", () => {
  test("401 -> unauthenticated -> /login", async ({ page }) => {
    // Mock 401 response
    await page.route("**/api/v1/auth/me", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Not authenticated" })
      });
    });

    await page.goto("http://localhost:3001/");
    
    // Assert final URL is /login
    await expect(page).toHaveURL(/.*\/login/);
    
    // Assert visible login content
    await expect(page.locator("text=Welcome back")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Assert no blank DOM state (body must have content)
    const bodyContent = await page.innerHTML("body");
    expect(bodyContent.trim().length).toBeGreaterThan(100);
  });

  test("onboarding + phone unverified -> /verify-phone", async ({ page }) => {
    await page.route("**/api/v1/auth/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "123",
          email: "test@example.com",
          first_name: "Test",
          last_name: "User",
          phone_number: null,
          phone_verified: false,
          profile_photo_url: null,
          handle: null,
          status: "onboarding"
        })
      });
    });

    await page.goto("http://localhost:3001/");
    
    // Assert final URL is /verify-phone
    await expect(page).toHaveURL(/.*\/verify-phone/);
    
    // Assert verify phone content
    await expect(page.locator("text=Enter your phone number")).toBeVisible();
  });

  test("onboarding + phone verified -> /setup-handle", async ({ page }) => {
    await page.route("**/api/v1/auth/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "123",
          email: "test@example.com",
          first_name: "Test",
          last_name: "User",
          phone_number: "+233200159884",
          phone_verified: true,
          profile_photo_url: null,
          handle: null,
          status: "onboarding"
        })
      });
    });

    await page.goto("http://localhost:3001/");
    
    // Assert final URL is /setup-handle
    await expect(page).toHaveURL(/.*\/setup-handle/);
    
    // Assert setup handle content
    await expect(page.locator("text=Claim your handle")).toBeVisible();
  });

  test("authenticated -> /", async ({ page }) => {
    await page.route("**/api/v1/auth/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "123",
          email: "test@example.com",
          first_name: "Test",
          last_name: "User",
          phone_number: "+233200159884",
          phone_verified: true,
          profile_photo_url: null,
          handle: "test_user",
          status: "authenticated"
        })
      });
    });

    await page.goto("http://localhost:3001/");
    
    // Assert final URL is /
    await expect(page).toHaveURL("http://localhost:3001/");
    
    // Assert AppShell content (assuming something like "Dashboard" or similar)
    // We will just assert that the main app layout rendered
    await expect(page.locator('main')).toBeVisible();
  });

  test("unexpected API failure -> visible error UI", async ({ page }) => {
    await page.route("**/api/v1/auth/me", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal Server Error" })
      });
    });

    await page.goto("http://localhost:3001/");
    
    // Assert error UI
    await expect(page.locator("text=Failed to authenticate. Please check your connection.")).toBeVisible();
  });
});

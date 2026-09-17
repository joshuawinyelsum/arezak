import { test, expect } from "@playwright/test";

test.describe("Phase 2E Final Audit", () => {
  const ts = Date.now();
  const user = {
    firstName: "Phase2E",
    lastName: "User",
    email: `phase2e_${ts}@example.com`,
    password: "Password123!"
  };

  test.beforeEach(async ({ page }) => {
    // Register
    await page.goto("/register");
    await page.fill("input[name=\"firstName\"]", user.firstName);
    await page.fill("input[name=\"lastName\"]", user.lastName);
    await page.fill("input[name=\"email\"]", user.email);
    await page.fill("input[name=\"password\"]", user.password);
    await page.fill("input[name=\"confirmPassword\"]", user.password);
    await page.click("button[type=\"submit\"]");
    await expect(page).toHaveURL("/login");

    // Login
    await page.goto("/login");
    await page.fill("input[type=\"email\"]", user.email);
    await page.fill("input[type=\"password\"]", user.password);
    await page.click("button[type=\"submit\"]");
    await expect(page).toHaveURL("/");
  });

  test("Transaction actions and Goal actions", async ({ page }) => {
    // 1. Create Account
    await page.goto("/accounts");
    await page.fill("input[placeholder=\"e.g. Daily Spending\"]", "Main");
    await page.click("button:has-text(\"Add Account\")");
    await expect(page.getByText("Main")).toBeVisible();

    // 2. Fund Account
    await page.goto("/transactions");
    await page.locator("button[aria-label=\"Fund Account\"]").evaluate(node => (node as HTMLButtonElement).click());
    await page.fill("input[placeholder=\"0.00\"]", "1000.00");
    await page.fill("input[placeholder=\"e.g. September allowance\"]", "Initial Fund");
    await page.locator("button:has-text(\"Fund Account\")").nth(1).evaluate(node => (node as HTMLButtonElement).click());
    await expect(page.getByText("Initial Fund")).toBeVisible();

    // 3. Edit Metadata
    await page.getByText("Edit").first().click({ force: true });
    await page.fill("input[placeholder=\"Extra details\"]", "Updated Note");
    await page.click("button:has-text(\"Save Metadata\")");
    await expect(page.getByText("Updated Note")).toBeVisible();

    // 4. Correct Transaction
    await page.getByText("Correct").first().click({ force: true });
    await page.fill("input[type=\"number\"]", "800.00");
    await page.click("button:has-text(\"Confirm Correction\")");
    await page.waitForTimeout(500); // Wait for load

    // 5. Create Goal
    await page.goto("/goals/create");
    await page.fill("input[placeholder=\"e.g. Emergency Fund\"]", "Test Goal");
    await page.fill("input[placeholder=\"0.00\"]", "500.00");
    await page.click("button:has-text(\"Create Goal\")");
    await expect(page).toHaveURL("/goals");

    // 6. Contribute to Goal
    await page.getByText("Contribute").first().click();
    await page.fill("input[placeholder=\"0.00\"]", "100.00");
    await page.click("button:has-text(\"Confirm Contribution\")");
    await page.waitForTimeout(500); // wait for completion

    // 7. Cancel Goal
    await page.getByText("Cancel Goal").first().click();
    await page.click("button:has-text(\"Cancel Goal & Return Funds\")");
    await page.waitForTimeout(500);

    // 8. Archive Cancelled Goal
    await page.getByText("Archive").first().click();
    await page.click("button:has-text(\"Archive Goal\")");
    await page.waitForTimeout(500);
    
    // Validate it disappeared
    await expect(page.getByText("Archive")).not.toBeVisible();
  });
});


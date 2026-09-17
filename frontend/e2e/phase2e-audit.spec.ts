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
    await page.fill("input[id=\"name\"]", user.firstName + " " + user.lastName);
    await page.fill("input[id=\"email\"]", user.email);
    await page.fill("input[id=\"password\"]", user.password);
    await page.click("button[type=\"submit\"]");
    await page.waitForURL("**/");
  });

  test("Transaction actions and Goal actions", async ({ page }) => {
    // (Accounts are auto-created for new users, so we can skip creation)

    // 2. Fund Account
    await page.goto("/transactions");
    await page.locator("button[aria-label=\"Fund Account\"]").evaluate(node => (node as HTMLButtonElement).click());
    await page.fill("input[placeholder=\"0.00\"]", "1000.00");
    await page.fill("input[placeholder=\"e.g. September allowance\"]", "Initial Fund");
    
    const [fundRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/transactions/income')),
      page.locator('button:has-text("Fund Account")').nth(1).evaluate(node => (node as HTMLButtonElement).click())
    ]);
    await expect(page.getByText("Initial Fund").first()).toBeVisible();

    // 3. Edit Metadata
    await page.getByText("Edit").first().click({ force: true });
    await page.fill("input[placeholder=\"Extra details\"]", "Updated Note");
    const [editRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/metadata')),
      page.getByRole('button', { name: 'Save Metadata' }).click()
    ]);
    await expect(page.getByText("Updated Note").first()).toBeVisible();

    // 4. Correct Transaction
    await page.getByText("Correct").first().click({ force: true });
    await page.fill("input[type=\"number\"]", "800.00");
    const [correctRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/correct')),
      page.getByRole('button', { name: 'Confirm Correction' }).click()
    ]);

    // 5. Create Goal
    await page.goto("/goals/create");
    await page.fill("input[placeholder=\"e.g. MacBook Pro M3\"]", "Test Goal");
    await page.fill("input[placeholder=\"2000.00\"]", "500.00");
    await page.getByRole('button', { name: 'Create Goal' }).evaluate(node => (node as HTMLButtonElement).click());
    await expect(page).toHaveURL("/goals");
    await expect(page.getByText("Test Goal")).toBeVisible();

    // 6. Contribute to Goal
    await page.getByText("Contribute").first().click();
    await page.fill("input[placeholder=\"0.00\"]", "100.00");
    const [contribRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/contributions')),
      page.getByRole('button', { name: 'Confirm Contribution' }).evaluate(node => (node as HTMLButtonElement).click())
    ]);
    await expect(page.getByText("Cancel Goal")).toBeVisible();

    // 7. Cancel Goal
    await page.getByText("Cancel Goal").first().click();
    const [cancelRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/cancel')),
      page.getByRole('button', { name: 'Cancel Goal & Return Funds' }).evaluate(node => (node as HTMLButtonElement).click())
    ]);
    await expect(page.getByText("Archive").first()).toBeVisible();

    // 8. Archive Goal
    await page.getByText("Archive").first().click();
    const [archiveRes] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/archive')),
      page.getByRole('button', { name: 'Archive Goal' }).evaluate(node => (node as HTMLButtonElement).click())
    ]);
    
    // Validate it disappeared
    await expect(page.getByText("Test Goal").first()).not.toBeVisible();
  });

});

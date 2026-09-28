import { expect, test, type Page } from "@playwright/test";

const account = {
  id: "d154c7e0-5887-485b-832f-e7c002235d60",
  name: "Main Account",
  total_balance: { amount_pesewas: 257500, currency: "GHS" },
  available_balance: { amount_pesewas: 250000, currency: "GHS" },
  locked_balance: { amount_pesewas: 5000, currency: "GHS" },
  reserved_balance: { amount_pesewas: 2500, currency: "GHS" },
};

async function mockDashboard(page: Page) {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: "test-user", name: "Flow Tester", email: "flow@example.test", currency: "GHS", timezone: "Africa/Accra" }),
  }));
  await page.route("**/api/v1/accounts", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([account]) }));
  await page.route("**/api/v1/transactions", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/api/v1/goals", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Good morning, Flow/ })).toBeVisible();
}

test.describe("Home financial flows", () => {
  test("Send asks recipient and network before amount, then reviews without submitting", async ({ page }) => {
    await mockDashboard(page);
    const operationsRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/operations/")) operationsRequests.push(request.url());
    });

    await page.getByRole("button", { name: /Send/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Who are you sending to?")).toBeVisible();
    await expect(dialog.getByLabel("Amount")).toHaveCount(0);
    await dialog.getByRole("button", { name: /^Mobile money/ }).click();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await expect(dialog.getByText("Choose receiving network")).toBeVisible();
    await dialog.getByRole("button", { name: /^MTN MoMo/ }).click();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByLabel("Recipient mobile number").fill("024 123 4567");
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByLabel("Amount").fill("12.50");
    await dialog.getByLabel("Reference or note (optional)").fill("Lunch");
    await dialog.getByRole("button", { name: "Continue" }).click();

    await expect(dialog.getByText("+233241234567")).toBeVisible();
    await expect(dialog.getByText("GH₵12.50")).toBeVisible();
    await expect(dialog.getByText("Not submitted", { exact: true })).toBeVisible();
    await expect(dialog.getByText(/No MTN, Telecel, or AirtelTigo provider is connected/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Live sending unavailable" })).toBeDisabled();
    expect(operationsRequests).toHaveLength(0);

    await dialog.getByRole("button", { name: "Go back" }).click();
    await expect(dialog.getByLabel("Amount")).toHaveValue("12.50");
  });

  test("Fund lists mobile, bank, and card sources without collecting unsupported payment details", async ({ page }) => {
    await mockDashboard(page);
    await page.getByRole("button", { name: /Fund/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Where is the money coming from?")).toBeVisible();
    await dialog.getByRole("button", { name: /^Bank account/ }).click();
    await expect(dialog.getByText("Bank account funding is coming soon")).toBeVisible();
    await expect(dialog.getByLabel("Account number")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Choose another source" }).click();
    await dialog.getByRole("button", { name: /Choose a mobile money network/ }).click();
    for (const network of [/MTN MoMo/, /Telecel Cash/, /AT Money \(AirtelTigo\)/]) {
      await expect(dialog.getByRole("button", { name: network })).toBeVisible();
    }
    await dialog.getByRole("button", { name: /MTN MoMo/ }).last().click();
    await expect(dialog.getByText("MTN MoMo funding is coming soon")).toBeVisible();
    await expect(dialog.getByLabel("Sending mobile number")).toHaveCount(0);
    await expect(dialog.getByText(/your Arezak balance will not change/)).toBeVisible();
  });

  test("Pay opens service availability and Quick Pay shortcuts enter the same Pay flow", async ({ page }) => {
    await mockDashboard(page);
    await page.getByRole("button", { name: /Pay/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("What would you like to pay for?")).toBeVisible();
    for (const service of ["Airtime", "Data", "Bills", "Merchant"]) {
      await expect(dialog.getByRole("button", { name: new RegExp(`^${service}`) })).toBeVisible();
    }
    await expect(dialog.getByRole("button", { name: "Payments coming soon" })).toBeDisabled();
    await dialog.getByRole("button", { name: /^Data/ }).click();
    await expect(dialog.getByText("This service is not connected yet")).toBeVisible();
    await dialog.getByRole("button", { name: "View all payment services" }).click();
    await dialog.getByRole("button", { name: "Close flow" }).click();

    await page.getByRole("button", { name: "Data, coming soon" }).click();
    const quickPayDialog = page.getByRole("dialog");
    await expect(quickPayDialog.getByText("This service is not connected yet")).toBeVisible();
    await expect(quickPayDialog.getByText("Data", { exact: true })).toBeVisible();
  });

  test("primary navigation keeps five labeled destinations", async ({ page }) => {
    await mockDashboard(page);
    const primaryNav = page.locator('nav[aria-label="Primary navigation"]:visible');
    const mobileViewport = (page.viewportSize()?.width ?? 1024) < 768;
    const destinations = mobileViewport ? ["Home", "Goals", "Rules", "Transactions", "More"] : ["Home", "Goals", "Rules", "Transactions"];
    for (const destination of destinations) {
      await expect(primaryNav.getByRole("link", { name: destination })).toBeVisible();
    }
    await expect(primaryNav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    if (!mobileViewport) await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("Withdraw validates available funds and shows fee limitations at review", async ({ page }) => {
    await mockDashboard(page);
    await page.getByRole("button", { name: /Withdraw/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Where should the money go?")).toBeVisible();
    await dialog.getByRole("button", { name: /^Mobile money/ }).click();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByRole("button", { name: /^Telecel Cash/ }).click();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByLabel("Receiving mobile number").fill("020 123 4567");
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByLabel("Amount").fill("9999.00");
    await dialog.getByRole("button", { name: "Review withdrawal" }).click();
    await expect(dialog.getByRole("alert").first()).toContainText("Amount exceeds this account’s available balance");
    await dialog.getByLabel("Amount").fill("100.00");
    await dialog.getByRole("button", { name: "Review withdrawal" }).click();
    await expect(dialog.getByText("+233201234567")).toBeVisible();
    await expect(dialog.getByText("Unavailable until a live fee quote is available")).toBeVisible();
    await expect(dialog.getByText("Not submitted", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Withdrawal unavailable" })).toBeDisabled();
  });

  test("the action footer stays inside the resized mobile viewport while an input is focused", async ({ page }) => {
    await mockDashboard(page);
    await page.setViewportSize({ width: 375, height: 760 });
    await page.getByRole("button", { name: /Send/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^Mobile money/ }).click();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByRole("button", { name: /^MTN MoMo/ }).click();
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByLabel("Recipient mobile number").fill("0241234567");
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByLabel("Amount").focus();
    await page.setViewportSize({ width: 375, height: 390 });
    await page.waitForTimeout(220);

    const geometry = await dialog.evaluate((element) => {
      const button = element.querySelector("footer button");
      const content = element.querySelector("[class*=overflow-y-auto]");
      if (!button || !content) return null;
      const buttonRect = button.getBoundingClientRect();
      const dialogRect = element.getBoundingClientRect();
      const overlayRect = element.parentElement!.getBoundingClientRect();
      const input = element.querySelector('input[name="amount"]');
      const inputRect = input?.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      return {
        viewportBottom: (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? window.innerHeight),
        dialogTop: dialogRect.top,
        dialogBottom: dialogRect.bottom,
        overlayTop: overlayRect.top,
        overlayBottom: overlayRect.bottom,
        buttonBottom: buttonRect.bottom,
        inputTop: inputRect?.top,
        inputBottom: inputRect?.bottom,
        contentTop: contentRect.top,
        contentBottom: contentRect.bottom,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.buttonBottom).toBeLessThanOrEqual(geometry!.viewportBottom + 1);
    expect(geometry!.inputTop).toBeGreaterThanOrEqual(geometry!.contentTop - 1);
    expect(geometry!.inputBottom).toBeLessThanOrEqual(geometry!.contentBottom + 1);
    await expect(dialog.getByRole("button", { name: "Continue" })).toBeVisible();
  });
});

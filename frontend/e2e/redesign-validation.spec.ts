import { test, expect } from "@playwright/test";

const user = {
  id: "validation-user",
  email: "validation@example.test",
  first_name: "Test",
  last_name: "User",
  phone_number: null,
  phone_verified: true,
  phone_verification_required: false,
  profile_photo_url: null,
  handle: "validation",
  status: "authenticated",
};
const accountFixture = {
  id: "validation-account",
  name: "Everyday account",
  status: "ACTIVE",
  total_balance: { amount_pesewas: 842050, currency: "GHS" },
  available_balance: { amount_pesewas: 642050, currency: "GHS" },
  reserved_balance: { amount_pesewas: 50000, currency: "GHS" },
  locked_balance: { amount_pesewas: 150000, currency: "GHS" },
};
const goalFixture = {
  id: "validation-goal", name: "Emergency fund", target_amount: 500000,
  current_amount: 150000, locked_amount: 150000, currency: "GHS", status: "ACTIVE", icon: "Target",
};
const transactionFixture = {
  id: "validation-transaction", type: "CARD_PURCHASE", amount: { amount_pesewas: 4525, currency: "GHS" },
  status: "COMPLETED", description: "Market groceries", direction: "OUTGOING", created_at: "2026-10-06T12:00:00Z",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: user }));
  await page.route("**/api/v1/accounts", (route) => route.fulfill({ json: [accountFixture] }));
  await page.route("**/api/v1/transactions", (route) => route.fulfill({ json: [transactionFixture] }));
  await page.route("**/api/v1/goals", (route) => route.fulfill({ json: [goalFixture] }));
  await page.route("**/api/v1/identity/security", (route) => route.fulfill({ json: { connected_providers: [] } }));
});

test("primary navigation, Rules state, and redesigned pages fit supported widths", async ({ page }) => {
  test.setTimeout(120_000);
  const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];
  const pages = ["/", "/accounts", "/goals", "/transactions", "/more", "/rules", "/settings", "/settings/security", "/settings/security/password", "/settings/profile", "/settings/appearance"];
  const expectedNavigation = [
    ["Home", "/"],
    ["Money", "/accounts"],
    ["Goals", "/goals"],
    ["Activity", "/transactions"],
    ["More", "/more"],
  ];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".home-page")).toBeVisible();
    await expect(page.locator(".vault-total")).toContainText("GH₵ 8,420.50");
    await expect(page.locator(".vault-pool.protected .vault-pool-value")).toContainText("GH₵ 2,000.00");
    await expect(page.locator(".vault-protected-breakdown")).toContainText("Reserved");
    await expect(page.locator(".vault-protected-breakdown")).toContainText("Locked");
    if (width === 390 || width === 1440) {
      await page.screenshot({ path: `test-results/arezak-home-${width}.png`, fullPage: true });
    }

    const primaryNavigation = page.locator('nav[aria-label="Primary navigation"]:visible');
    const links = primaryNavigation.locator("a");
    await expect(links).toHaveCount(expectedNavigation.length);
    for (let index = 0; index < expectedNavigation.length; index += 1) {
      const [label, href] = expectedNavigation[index];
      await expect(links.nth(index)).toHaveAttribute("href", href);
      await expect(links.nth(index)).toContainText(label);
    }

    const homeWidth = await page.locator(".page-canvas").evaluate((canvas) => ({ clientWidth: canvas.clientWidth, scrollWidth: canvas.scrollWidth }));
    expect(homeWidth.scrollWidth, `Home overflowed at ${width}px`).toBeLessThanOrEqual(homeWidth.clientWidth + 1);

    for (const pathname of pages.slice(1)) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".page-frame").first(), `${pathname} should render at ${width}px`).toBeVisible({ timeout: 10000 });
      const widthState = await page.locator(".page-canvas").evaluate((canvas) => ({
        clientWidth: canvas.clientWidth,
        scrollWidth: canvas.scrollWidth,
      }));
      expect(widthState.scrollWidth, `${pathname} overflowed at ${width}px`).toBeLessThanOrEqual(widthState.clientWidth + 1);
    }

    await page.goto("/rules", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Rule management unavailable")).toBeVisible();
    await expect(page.getByRole("button", { name: "New rule" })).toBeDisabled();
  }
});

test("goal deletion uses a viewport-wide modal and reaches the existing delete API", async ({ page }) => {
  const goal = {
    id: "goal-delete-test", name: "Emergency fund", target_amount: 250000, current_amount: 0,
    locked_amount: 0, currency: "GHS", status: "ACTIVE", icon: "Target", is_eligible_for_release: false,
  };
  let deletionCount = 0;
  await page.route("**/api/v1/accounts", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/v1/goals/goal-delete-test", async (route) => {
    if (route.request().method() === "DELETE") {
      deletionCount += 1;
      await route.fulfill({ status: 204 });
    } else {
      await route.fulfill({ json: goal });
    }
  });

  await page.goto("/goals/goal-delete-test", { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", { name: "Delete goal" });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Delete goal" });
    await expect(dialog).toBeVisible();
    await expect(page.locator(".app-shell")).toHaveJSProperty("inert", true);
    const box = await page.locator("[data-modal-backdrop]").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBe(0);
    expect(box!.y).toBe(0);
    expect(box!.width).toBe(width);
    expect(box!.height).toBe(844);
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".app-shell")).toHaveJSProperty("inert", false);
  }

  await trigger.click();
  await page.getByRole("dialog", { name: "Delete goal" }).getByRole("button", { name: "Delete goal" }).click();
  await expect(page).toHaveURL(/\/goals$/);
  expect(deletionCount).toBe(1);
});

test("appearance choices apply the Arezak light, dark, and system states", async ({ page }) => {
  await page.goto("/settings/appearance", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Light/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Dark/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /System/ })).toBeVisible();

  await page.getByRole("button", { name: /Dark/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/");
  await expect(page.locator(".vault-total")).toContainText("GH₵ 8,420.50");
  await page.screenshot({ path: "test-results/arezak-home-dark-390.png", fullPage: true });

  await page.goto("/settings/appearance");
  await page.getByRole("button", { name: /Light/ }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: /System/ }).click();
  await expect(page.getByRole("button", { name: /System/ })).toHaveAttribute("aria-pressed", "true");
});

test("a successful profile photo upload displays the URL returned by the API", async ({ page }) => {
  const uploadedPhoto = "https://avatar.example.test/new-photo.png";
  let photoUploaded = false;
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: photoUploaded ? { ...user, profile_photo_url: uploadedPhoto } : user }));
  await page.route("**/api/v1/identity/profile/photo", async (route) => {
    if (route.request().method() === "PUT") {
      photoUploaded = true;
      await route.fulfill({ json: { ...user, profile_photo_url: uploadedPhoto } });
    } else {
      await route.continue();
    }
  });
  await page.route(uploadedPhoto, (route) => route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/WQAAAABJRU5ErkJggg==", "base64") }));
  await page.goto("/settings/profile", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="file"]').setInputFiles({
    name: "profile.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/WQAAAABJRU5ErkJggg==", "base64"),
  });
  await expect(page.getByRole("status")).toContainText("Photo updated successfully.");
  await expect(page.getByRole("img", { name: "Profile" })).toHaveAttribute("src", uploadedPhoto);
  await expect(page.locator(".mobile-avatar img")).toHaveAttribute("src", uploadedPhoto);
});

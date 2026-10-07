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

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: user }));
  await page.route("**/api/v1/accounts", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/v1/transactions", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/v1/goals", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/v1/identity/security", (route) => route.fulfill({ json: { connected_providers: [] } }));
});

test("primary navigation, Rules state, and redesigned pages fit supported widths", async ({ page }) => {
  const widths = [320, 375, 390, 430, 768, 1024, 1440];
  const pages = ["/", "/accounts", "/transactions", "/rules", "/goals", "/settings", "/settings/security", "/settings/profile"];
  const expectedNavigation = [
    ["Home", "/"],
    ["Money", "/accounts"],
    ["Activity", "/transactions"],
    ["Rules", "/rules"],
    ["You", "/settings"],
  ];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".home-page")).toBeVisible();

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
      await expect(page.locator(".page-frame").first()).toBeVisible();
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

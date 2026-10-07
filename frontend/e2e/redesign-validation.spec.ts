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
  id: "validation-transaction", type: "EXPENSE", amount: { amount_pesewas: 4525, currency: "GHS" },
  status: "COMPLETED", description: "Market groceries", direction: "OUTGOING", created_at: "2026-10-06T12:00:00Z",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: user }));
  await page.route("**/api/v1/accounts", (route) => route.fulfill({ json: [accountFixture] }));
  await page.route("**/api/v1/transactions", (route) => route.fulfill({ json: [transactionFixture] }));
  await page.route("**/api/v1/goals", (route) => route.fulfill({ json: [goalFixture] }));
  await page.route("**/api/v1/goals/validation-goal", (route) => route.fulfill({ json: goalFixture }));
  await page.route("**/api/v1/identity/security", (route) => route.fulfill({ json: { connected_providers: [] } }));
  await page.route("**/api/v1/identity/me", (route) => route.fulfill({ json: {
    display_name: "Test User", handle: "validation", accounts: [{
      account_id: "validation-account", account_name: "Everyday account", account_number: "123456789012",
      qr_payload: "arezak://receive/validation-token",
    }],
  } }));
});

test("primary navigation, Rules state, and redesigned pages fit supported widths", async ({ page }) => {
  test.setTimeout(120_000);
  const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440];
  const pages = ["/", "/accounts", "/goals", "/goals/create", "/goals/validation-goal", "/transactions", "/more", "/rules", "/settings", "/settings/security", "/settings/security/password", "/settings/profile", "/settings/appearance"];
  const expectedNavigation = [
    ["Home", "/"],
    ["Goals", "/goals"],
    ["Activity", "/transactions"],
    ["More", "/more"],
  ];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-testid=\"home-page\"]")).toBeVisible();
    await expect(page.locator("[data-testid=\"vault-total\"]")).toContainText("GH₵8,420.50");
    await expect(page.locator("[data-testid=\"vault-pool-value\"]")).toContainText("GH₵2,000.00");
    await expect(page.locator("[data-testid=\"vault-pool-protected\"]")).not.toContainText("Reserved");
    await expect(page.locator("[data-testid=\"vault-pool-protected\"]")).not.toContainText("Locked");
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
    await expect(primaryNavigation.getByRole("button", { name: "Money actions" })).toBeVisible();
    await expect(primaryNavigation).not.toContainText("Money");
    if (width < 768) await expect(page.locator("[aria-label=\"Profile settings\"] svg")).toBeVisible();
    else await expect(page.locator(".user-avatar svg")).toBeVisible();


    const homeWidth = await page.locator(".page-canvas").evaluate((canvas) => ({ clientWidth: canvas.clientWidth, scrollWidth: canvas.scrollWidth }));
    expect(homeWidth.scrollWidth, `Home overflowed at ${width}px`).toBeLessThanOrEqual(homeWidth.clientWidth + 1);

    for (const pathname of pages.slice(1)) {
      await page.goto(pathname, { waitUntil: "domcontentloaded" });
      const screenRoot = pathname === "/goals/create"
        ? page.getByRole("heading", { name: "Create Goal" })
        : pathname === "/goals/validation-goal"
          ? page.getByRole("heading", { name: "Emergency fund" })
          : page.locator(".page-frame").first();
      await expect(screenRoot, `${pathname} should render at ${width}px`).toBeVisible({ timeout: 10000 });
      if (pathname === "/settings" || pathname === "/settings/profile") {
        await expect(page.getByText("TU", { exact: true })).toHaveCount(0);
      }
      if (width === 390 || width === 1440) {
        const slug = pathname.replaceAll("/", "-").replace(/^-/, "home") || "home";
        await page.screenshot({ path: `test-results/arezak-${slug}-${width}.png`, fullPage: true });
      }
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

test("the center action opens only money operations and Fund uses the existing income API", async ({ page }) => {
  let fundBody: Record<string, unknown> | null = null;
  await page.route("**/api/v1/transactions/income", async (route) => {
    fundBody = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { id: "fund-test", status: "COMPLETED" } });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator('nav[aria-label="Primary navigation"]:visible').getByRole("button", { name: "Money actions" }).click();
  const menu = page.getByRole("dialog", { name: "Money actions" });
  await expect(menu).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/arezak-actions-sheet-390.png", fullPage: true });
  for (const label of ["Send Money", "Receive Money", "Scan & Pay", "Fund Account", "Withdraw"]) {
    await expect(menu.getByRole("button", { name: label })).toBeVisible();
  }
  await expect(menu).not.toContainText("Create Goal");
  await expect(menu).not.toContainText("Security");
  await menu.getByRole("button", { name: "Fund Account" }).click();
  const fundingDialog = page.getByRole("dialog", { name: "Fund account" });
  await expect(fundingDialog).toBeVisible();
  await page.screenshot({ path: "test-results/arezak-fund-dialog-390.png", fullPage: true });
  await fundingDialog.getByLabel("Amount (GH₵)").fill("25.00");
  await fundingDialog.getByLabel("Funding source").selectOption("Salary");
  await fundingDialog.getByRole("button", { name: "Fund Account", exact: true }).click();
  await expect(fundingDialog).toHaveCount(0);
  expect(fundBody).toMatchObject({ account_id: "validation-account", amount: { amount_pesewas: 2500, currency: "GHS" }, funding_source: "Salary" });
});

test("Scan & Pay starts the camera after the video renders and resolves the scanned Arezak QR", async ({ page }) => {
  const scannedValue = "arezak://receive/validation-token-1234567890";
  await page.addInitScript((qrValue) => {
    let cameraStopped = false;
    Object.defineProperty(window, "BarcodeDetector", { configurable: true, value: class {
      async detect(video: HTMLVideoElement) {
        if (video.isConnected) Object.defineProperty(window, "__videoWasConnected", { configurable: true, value: true });
        return [{ rawValue: qrValue }];
      }
    } });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
      getUserMedia: async () => {
        const stream = new MediaStream();
        Object.defineProperty(stream, "getTracks", { value: () => [{ stop: () => { cameraStopped = true; } }] });
        return stream;
      },
    } });
    HTMLMediaElement.prototype.play = async () => undefined;
    Object.defineProperty(window, "__cameraStopped", { configurable: true, get: () => cameraStopped });
  }, scannedValue);

  let resolvedIdentifier = "";
  await page.route("**/api/v1/identity/resolve", async (route) => {
    resolvedIdentifier = route.request().postDataJSON().identifier;
    await route.fulfill({ json: { display_name: "Recipient User", handle: "recipient", account_number: "998877665544", masked_phone_number: null } });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator('nav[aria-label="Primary navigation"]:visible').getByRole("button", { name: "Money actions" }).click();
  await page.getByRole("dialog", { name: "Money actions" }).getByRole("button", { name: "Scan & Pay" }).click();
  await page.getByRole("button", { name: "Scan Arezak QR" }).click();
  await expect(page.getByLabel(/Account number, @handle/)).toHaveValue(scannedValue);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Is this the right person?")).toBeVisible();
  expect(resolvedIdentifier).toBe(scannedValue);
  expect(await page.evaluate(() => (window as unknown as { __cameraStopped: boolean }).__cameraStopped)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __videoWasConnected: boolean }).__videoWasConnected)).toBe(true);
});

test("QR scanning reports camera permission failures without opening a resolver flow", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "BarcodeDetector", { configurable: true, value: class { async detect() { return []; } } });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
      getUserMedia: async () => { throw new DOMException("Permission denied", "NotAllowedError"); },
    } });
  });
  let resolverCalled = false;
  await page.route("**/api/v1/identity/resolve", async (route) => {
    resolverCalled = true;
    await route.fulfill({ status: 404, json: { detail: "Not found" } });
  });
  await page.goto("/");
  await page.locator('nav[aria-label="Primary navigation"]:visible').getByRole("button", { name: "Money actions" }).click();
  await page.getByRole("dialog", { name: "Money actions" }).getByRole("button", { name: "Scan & Pay" }).click();
  await page.getByRole("button", { name: "Scan Arezak QR" }).click();
  await expect(page.getByRole("status")).toContainText("Camera access was denied");
  expect(resolverCalled).toBe(false);
});

test("QR scanning falls back to the decoder when the browser has no BarcodeDetector", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "BarcodeDetector", { configurable: true, value: undefined });
    let stopped = false;
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
      getUserMedia: async () => {
        const stream = new MediaStream();
        Object.defineProperty(stream, "getTracks", { value: () => [{ stop: () => { stopped = true; } }] });
        return stream;
      },
    } });
    HTMLMediaElement.prototype.play = async () => undefined;
    Object.defineProperty(window, "__cameraStopped", { configurable: true, get: () => stopped });
  });
  await page.goto("/");
  await page.locator('nav[aria-label="Primary navigation"]:visible').getByRole("button", { name: "Money actions" }).click();
  await page.getByRole("dialog", { name: "Money actions" }).getByRole("button", { name: "Scan & Pay" }).click();
  await page.getByRole("button", { name: "Scan Arezak QR" }).click();
  await expect(page.getByLabel("Camera view for scanning an Arezak QR")).toBeVisible();
  await expect(page.getByText("QR scanning could not start", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Stop scanning" }).click();
  expect(await page.evaluate(() => (window as unknown as { __cameraStopped: boolean }).__cameraStopped)).toBe(true);
});

test("malformed QR values are rejected and the live camera can be stopped and restarted cleanly", async ({ page }) => {
  await page.addInitScript(() => {
    let starts = 0;
    let stoppedTracks = 0;
    Object.defineProperty(window, "BarcodeDetector", { configurable: true, value: class { async detect() { return [{ rawValue: "https://example.test/not-arezak" }]; } } });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
      getUserMedia: async () => {
        starts += 1;
        const stream = new MediaStream();
        Object.defineProperty(stream, "getTracks", { value: () => [{ stop: () => { stoppedTracks += 1; } }] });
        return stream;
      },
    } });
    HTMLMediaElement.prototype.play = async () => undefined;
    Object.defineProperty(window, "__cameraStats", { configurable: true, get: () => ({ starts, stoppedTracks }) });
  });
  let resolverCalled = false;
  await page.route("**/api/v1/identity/resolve", async (route) => {
    resolverCalled = true;
    await route.fulfill({ status: 404, json: { detail: "Not found" } });
  });
  await page.goto("/");
  await page.locator('nav[aria-label="Primary navigation"]:visible').getByRole("button", { name: "Money actions" }).click();
  await page.getByRole("dialog", { name: "Money actions" }).getByRole("button", { name: "Scan & Pay" }).click();
  await page.getByRole("button", { name: "Scan Arezak QR" }).click();
  await expect(page.getByText("This isn’t an Arezak QR", { exact: false })).toBeVisible();
  await expect(page.getByLabel(/Account number, @handle/)).toHaveValue("");
  expect(resolverCalled).toBe(false);
  await page.getByRole("button", { name: "Stop scanning" }).click();
  await page.getByRole("button", { name: "Scan Arezak QR" }).click();
  await expect(page.getByText("This isn’t an Arezak QR", { exact: false })).toBeVisible();
  const stats = await page.evaluate(() => (window as unknown as { __cameraStats: { starts: number; stoppedTracks: number } }).__cameraStats);
  expect(stats).toEqual({ starts: 2, stoppedTracks: 1 });
  await page.getByRole("button", { name: "Stop scanning" }).click();
});

test("a valid but unknown Arezak QR fails through the identity resolver", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "BarcodeDetector", { configurable: true, value: class { async detect() { return [{ rawValue: "arezak://receive/unknown-token-1234567890" }]; } } });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => new MediaStream() } });
    HTMLMediaElement.prototype.play = async () => undefined;
  });
  let resolvedIdentifier = "";
  await page.route("**/api/v1/identity/resolve", async (route) => {
    resolvedIdentifier = route.request().postDataJSON().identifier;
    await route.fulfill({ status: 404, json: { detail: "Recipient not found" } });
  });
  await page.goto("/");
  await page.locator('nav[aria-label="Primary navigation"]:visible').getByRole("button", { name: "Money actions" }).click();
  await page.getByRole("dialog", { name: "Money actions" }).getByRole("button", { name: "Scan & Pay" }).click();
  await page.getByRole("button", { name: "Scan Arezak QR" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("form#send-flow-form [role=alert]")).toContainText("We couldn’t find an active Arezak account");
  expect(resolvedIdentifier).toBe("arezak://receive/unknown-token-1234567890");
});

test("authentication and receive screens use the Arezak shell at mobile and desktop widths", async ({ page }) => {
  await page.route("https://accounts.google.com/gsi/client", (route) => route.abort());
  for (const width of [390, 1440]) {
    await page.route("**/api/v1/auth/me", (route) => route.fulfill({ status: 401, json: { detail: "Not authenticated" } }));
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/login", "/register", "/forgot-password", "/reset-password?token=visual-check"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1").first(), `${path} heading should render`).toBeVisible();
      if (path === "/login") {
        await expect(page.getByRole("button", { name: /Google/i }).first()).toBeVisible();
        await expect(page.getByText("Loading Google sign-in", { exact: true })).toHaveCount(0);
      }
      expect(await page.locator("body").evaluate((body) => body.scrollWidth)).toBeLessThanOrEqual(width);
      if (width === 390 && path === "/login") await page.screenshot({ path: "test-results/arezak-login-390.png", fullPage: true });
    }
    await page.route("**/api/v1/auth/me", (route) => route.fulfill({ json: user }));
    await page.goto("/receive", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("123456789012")).toBeVisible();
    if (width === 390) await page.screenshot({ path: "test-results/arezak-receive-390.png", fullPage: true });
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
    if (width === 390) await page.screenshot({ path: "test-results/arezak-goal-delete-390.png", fullPage: true });
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

test("goal creation and editing submit through the existing goal API", async ({ page }) => {
  let createdGoal: Record<string, unknown> | null = null;
  let editedGoal: Record<string, unknown> | null = null;
  await page.route("**/api/v1/goals", async (route) => {
    if (route.request().method() === "POST") {
      createdGoal = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { ...goalFixture, ...createdGoal } });
    } else {
      await route.fulfill({ json: [goalFixture] });
    }
  });
  await page.route("**/api/v1/goals/validation-goal", async (route) => {
    if (route.request().method() === "PATCH") {
      editedGoal = route.request().postDataJSON();
      await route.fulfill({ json: { ...goalFixture, ...editedGoal } });
    } else {
      await route.fulfill({ json: goalFixture });
    }
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/goals/create", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Goal Name").fill("Travel fund");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Target Amount").fill("2500");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Review your goal" })).toBeVisible();
  await page.screenshot({ path: "test-results/arezak-goal-create-review-390.png", fullPage: true });
  await page.getByRole("button", { name: "Create Goal" }).click();
  await expect(page).toHaveURL(/\/goals$/);
  expect(createdGoal).toMatchObject({ name: "Travel fund", target_amount: 250000, currency: "GHS", lock_type: "TARGET_REACHED" });

  await page.goto("/goals/validation-goal", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Edit Goal" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit goal" });
  await expect(dialog).toBeVisible();
  const backdrop = await page.locator("[data-modal-backdrop]").boundingBox();
  expect(backdrop).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });
  await page.screenshot({ path: "test-results/arezak-goal-edit-390.png", fullPage: true });
  await dialog.getByLabel("Goal Name").fill("Updated emergency fund");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog).toHaveCount(0);
  expect(editedGoal).toEqual({ name: "Updated emergency fund", icon: "Target" });
});

test("activity transaction actions open the shared viewport modal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/transactions", { waitUntil: "domcontentloaded" });
  const transaction = page.getByRole("article").filter({ hasText: "Market groceries" });
  await expect(transaction).toBeVisible();
  await transaction.getByRole("button", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit transaction metadata" });
  await expect(dialog).toBeVisible();
  const backdrop = await page.locator("[data-modal-backdrop]").boundingBox();
  expect(backdrop).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });
  await page.screenshot({ path: "test-results/arezak-transaction-dialog-390.png", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("appearance choices apply the Arezak light, dark, and system states", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings/appearance", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Light/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Dark/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /System/ })).toBeVisible();

  await page.getByRole("button", { name: /Dark/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/");
  await expect(page.locator("[data-testid=\"vault-total\"]")).toContainText("GH₵8,420.50");
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

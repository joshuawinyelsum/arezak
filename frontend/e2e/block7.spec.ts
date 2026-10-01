import { test, expect } from '@playwright/test';

test.describe('Block 7 - Complete Test Suite', () => {

  test('AUTH UI: forms and hierarchy', async ({ page }) => {
    await page.goto('/register');
    const manualForm = page.locator('form');
    await expect(manualForm).toBeVisible();
    await expect(page.getByText('First name')).toBeVisible();
    const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
    const appleBtn = page.getByRole('button', { name: /Continue with Apple/i });
    await expect(googleBtn).toBeVisible();
    await expect(appleBtn).toBeVisible();
    
    const formBBox = await manualForm.boundingBox();
    const googleBBox = await googleBtn.boundingBox();
    expect(formBBox!.y).toBeLessThan(googleBBox!.y);

    await page.goto('/login');
    const loginForm = page.locator('form');
    await expect(loginForm).toBeVisible();
    const loginGoogleBtn = page.getByRole('button', { name: /Continue with Google/i });
    await expect(loginGoogleBtn).toBeVisible();
    
    const loginFormBBox = await loginForm.boundingBox();
    const loginGoogleBBox = await loginGoogleBtn.boundingBox();
    expect(loginFormBBox!.y).toBeLessThan(loginGoogleBBox!.y);
  });

  test('SOCIAL AUTH: Configuration errors if missing', async ({ page }) => {
    // Force environment variables not to exist in the browser context by intercepting
    // We already know it should render the unconfigured button.
    await page.goto('/login');
    const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
    await googleBtn.click();
    await expect(page.getByText(/Google authentication is not configured in this environment/i)).toBeVisible();
    
    const appleBtn = page.getByRole('button', { name: /Continue with Apple/i });
    await appleBtn.click();
    await expect(page.getByText(/Apple authentication is not configured in this environment/i)).toBeVisible();
  });

  test('ONBOARDING & HANDLE: Validation and Routing', async ({ page }) => {
    // Mock authenticated but no handle
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({ json: { id: 'user_1', email: 'a@domain.com', phone_verified: true, handle: null, status: 'onboarding' } });
    });
    
    await page.goto('/');
    // Should be redirected to handle setup since phone is verified
    await expect(page).toHaveURL(/\/setup-handle/);
    
    // Mock Handle Check
    let resolveCalls = 0;
    await page.route('**/api/v1/identity/resolve', async route => {
      resolveCalls++;
      const req = route.request();
      const body = JSON.parse(req.postData()!);
      if (body.identifier === '@taken') {
        await route.fulfill({ status: 200, json: { id: 'other' } });
      } else {
        await route.fulfill({ status: 404, json: { detail: 'Not found' } });
      }
    });

    const handleInput = page.locator('input[type="text"]');
    
    // Invalid
    await handleInput.fill('ab');
    await expect(page.getByText('Invalid handle')).toBeVisible();
    
    // Taken
    await handleInput.fill('taken');
    await expect(page.getByText('That handle is unavailable')).toBeVisible();
    
    // Available
    await handleInput.fill('available');
    await expect(page.getByText('Available')).toBeVisible();
    
    // Verify debouncing (resolveCalls shouldn't be too high)
    expect(resolveCalls).toBeLessThanOrEqual(3);
  });

  test('PROFILE: Photo removal calls DELETE', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({ json: { id: 'user_1', first_name: 'John', last_name: 'Doe', phone_verified: true, handle: '@john', status: 'authenticated', profile_photo_url: 'http://example.com/photo.jpg' } });
    });
    
    let deleteCalled = false;
    await page.route('**/api/v1/identity/profile/photo', async route => {
      if (route.request().method() === 'DELETE') {
        deleteCalled = true;
        await route.fulfill({ status: 200, json: { success: true } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/settings/profile');
    
    const removeBtn = page.getByRole('button', { name: /Remove/i });
    await removeBtn.click();
    
    expect(deleteCalled).toBe(true);
    await expect(page.getByText('Photo removed')).toBeVisible();
  });

  test('SECURITY & SETTINGS: No fake sessions, honest messaging', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async route => {
      await route.fulfill({ json: { id: 'user_1', status: 'authenticated' } });
    });
    await page.route('**/api/v1/identity/security', async route => {
      await route.fulfill({ json: { has_password: true, connected_providers: [] } });
    });
    
    // Security
    await page.goto('/settings/security');
    await expect(page.getByText(/Session management is not yet implemented/i)).toBeVisible();
    
    // Notifications
    await page.goto('/settings/notifications');
    await expect(page.getByText(/Account-level synchronization and push delivery are not yet implemented/i)).toBeVisible();
  });

});

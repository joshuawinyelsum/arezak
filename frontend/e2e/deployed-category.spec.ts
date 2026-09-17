import { test, expect } from '@playwright/test';

test('Deployed Goal Category Test', async ({ page }) => {
  test.setTimeout(60000);
  
  await page.goto('https://arezak-staging.vercel.app/register');
  const uid = Date.now();
  await page.fill('input[type="email"]', `userA_${uid}@example.com`);
  await page.fill('input[type="text"]', `User A ${uid}`);
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('https://arezak-staging.vercel.app/');

  await page.click('text=Goals');
  await page.waitForURL('**/goals');

  await page.click('text=Create Goal');
  await page.waitForURL('**/goals/create');
  
  await page.fill('input[placeholder="e.g. MacBook Pro M3"]', 'Yamaha Keyboard');
  await page.fill('input[placeholder="2000.00"]', '5000.00');

  await page.click('text=Create custom category');
  await page.waitForSelector('text=Category name');
  await page.fill('input[placeholder="e.g. Music Equipment"]', 'Music Equipment');
  await page.waitForSelector('button > svg.lucide');
  await page.locator('button > svg.lucide-music').locator('..').click();
  
  // FIX: use specific button type
  await page.getByRole('button', { name: 'Create', exact: true }).click({ force: true });

  await page.waitForSelector('text=Create custom category', { state: 'hidden' }); 
  
  await page.locator('button[type="submit"][form="create-goal-form"]').click({ force: true });
  await page.waitForURL('**/goals');

  await expect(page.getByText('Music Equipment').first()).toBeVisible();
});

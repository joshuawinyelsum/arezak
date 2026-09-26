const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const URL = 'https://arezak-staging.vercel.app';
  
  // Login
  const email = \	est_edit_\@example.com\;
  const res = await page.request.post(\https://arezak-staging-c496.up.railway.app/api/v1/auth/register\, {
    data: { name: 'Test User', email: email, password: 'Password123!' },
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  });
  
  await page.goto(\\/login\);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(\\/\);
  
  await page.goto(\\/goals\);
  await page.click('text="New Goal"');
  await page.fill('input[type="text"]', 'Test Goal');
  await page.fill('input[type="number"]', '4500');
  await page.click('button:has-text("Create Goal")');
  await page.waitForSelector('text="Test Goal"');
  
  // Try edit 4500 -> 3000
  let patchReq;
  let patchRes;
  page.on('response', async response => {
    if (response.url().includes('/goals/') && (response.request().method() === 'PATCH' || response.request().method() === 'PUT')) {
        patchReq = response.request().postData();
        patchRes = { status: response.status(), body: await response.json().catch(() => null) };
        console.log(response.request().method(), "REQ:", patchReq);
        console.log(response.request().method(), "RES:", patchRes);
    }
  });

  await page.click('button[aria-label="Edit Goal"]');
  await page.fill('input[type="number"]', '3000');
  await page.click('button:has-text("Save Changes")');
  await page.waitForTimeout(2000);
  
  await browser.close();
})();

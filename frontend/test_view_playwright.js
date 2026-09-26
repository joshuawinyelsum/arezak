const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const URL = 'http://localhost:3003';
  
  // Login
  const email = 'test_view_' + Date.now() + '@example.com';
  const res = await page.request.post('http://localhost:8000/api/v1/auth/register', {
    data: { name: 'Test User', email: email, password: 'Password123!' },
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  });
  
  await page.goto(URL + '/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(URL + '/');
  
  // Create goal directly via API
  await page.request.post('http://localhost:8000/api/v1/goals', {
    data: { name: 'Test Goal API', icon: 'Target', target_amount: 450000, currency: 'GHS', lock_type: 'TARGET_REACHED' },
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  });
  
  await page.goto(URL + '/goals');
  await page.waitForSelector('text="Test Goal API"');
  
  // Click View Goal
  await page.click('text="View Goal"');
  await page.waitForTimeout(2000);
  console.log("Current URL after click:", page.url());
  
  await browser.close();
})();

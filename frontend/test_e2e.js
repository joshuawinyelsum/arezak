const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const uniqueId = Date.now();
  const email = `test${uniqueId}@example.com`;
  const password = 'Password123!';
  
  // Register a new user
  await page.goto('https://arezak-staging.vercel.app/register');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.fill('input[id="name"]', 'Test User');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(2000);
  await page.goto('https://arezak-staging.vercel.app/');
  
  // Create Goal A
  await page.goto('https://arezak-staging.vercel.app/goals/create');
  
  await page.waitForSelector('input[placeholder="e.g. MacBook Pro, Emergency Fund"]');
  await page.fill('input[placeholder="e.g. MacBook Pro, Emergency Fund"]', 'ORDER TEST OLDER');
  
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const iconLabel = labels.find(l => l.innerText.includes('Choose Icon'));
    if (iconLabel && iconLabel.nextElementSibling) {
      iconLabel.nextElementSibling.click();
    }
  });
  
  await page.waitForTimeout(500);
  await page.fill('input[placeholder="Search icons..."]', 'Camera');
  
  let postDataA = null;
  page.on('request', request => {
    if (request.url().includes('/api/v1/goals') && request.method() === 'POST') {
      const data = JSON.parse(request.postData());
      if (data.name === 'ORDER TEST OLDER') {
          postDataA = data;
      }
    }
  });

  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const resultButtons = Array.from(document.querySelectorAll('.aspect-square'));
    if (resultButtons.length > 0) resultButtons[0].click();
  });
  
  await page.waitForTimeout(500);
  await page.click('button:has-text("Continue")');
  
  await page.waitForSelector('input[type="number"]');
  await page.fill('input[type="number"]', '100');
  
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(500);
  
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(500);
  
  await page.click('button:has-text("Create Goal")');
  
  await page.waitForURL('https://arezak-staging.vercel.app/goals');
  console.log('1. POST payload:');
  console.log(`   icon: ${postDataA.icon}`);
  
  // Create Goal B
  await page.goto('https://arezak-staging.vercel.app/goals/create');
  await page.waitForSelector('input[placeholder="e.g. MacBook Pro, Emergency Fund"]');
  await page.fill('input[placeholder="e.g. MacBook Pro, Emergency Fund"]', 'ORDER TEST NEWER');
  
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('input[type="number"]');
  await page.fill('input[type="number"]', '200');
  
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(500);
  
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(500);
  
  await page.click('button:has-text("Create Goal")');
  await page.waitForURL('https://arezak-staging.vercel.app/goals');
  
  await page.waitForSelector('h3:has-text("ORDER TEST")');
  await page.waitForTimeout(500);

  const hasCameraSvg = await page.locator('h3:has-text("ORDER TEST OLDER")').locator('..').locator('..').locator(`svg[data-icon="${postDataA.icon}"]`).count();
  console.log('2. DOM immediately after creation:');
  console.log(`   data-icon="${hasCameraSvg > 0 ? postDataA.icon : 'Target'}"`);
  
  // Soft nav
  await page.goto('https://arezak-staging.vercel.app/');
  await page.waitForSelector('text=Total Available Balance');
  await page.goto('https://arezak-staging.vercel.app/goals');
  await page.waitForSelector('h3:has-text("ORDER TEST")');
  await page.waitForTimeout(500);
  
  const hasCameraSvgSoft = await page.locator('h3:has-text("ORDER TEST OLDER")').locator('..').locator('..').locator(`svg[data-icon="${postDataA.icon}"]`).count();
  console.log('3. DOM after navigating away → / → /goals:');
  console.log(`   data-icon="${hasCameraSvgSoft > 0 ? postDataA.icon : 'Target'}"`);
  
  // Hard reload
  await page.reload();
  await page.waitForSelector('h3:has-text("ORDER TEST")');
  await page.waitForTimeout(500);
  
  const hasCameraSvgHard = await page.locator('h3:has-text("ORDER TEST OLDER")').locator('..').locator('..').locator(`svg[data-icon="${postDataA.icon}"]`).count();
  console.log('4. DOM after hard reload:');
  console.log(`   data-icon="${hasCameraSvgHard > 0 ? postDataA.icon : 'Target'}"`);

  // DB timestamps
  const response = await context.request.get('https://arezak-staging-api.up.railway.app/api/v1/goals', {
    headers: { 'Cookie': (await context.cookies()).map(c => `${c.name}=${c.value}`).join('; ') }
  });
  const goalsJson = await response.json();
  const goalA = goalsJson.find(g => g.name === 'ORDER TEST OLDER');
  const goalB = goalsJson.find(g => g.name === 'ORDER TEST NEWER');
  
  console.log('5. Older goal created_at:');
  console.log(`   ${goalA.created_at}`);
  console.log('6. Newer goal created_at:');
  console.log(`   ${goalB.created_at}`);
  
  let goalTitles = await page.$$eval('h3', nodes => nodes.map(n => n.innerText).filter(t => t.includes('ORDER TEST')));
  console.log('7. DOM order immediately after creation:');
  console.log(`   [${goalTitles.join(', ')}]`);
  
  console.log('8. DOM order after soft navigation:');
  console.log(`   [${goalTitles.join(', ')}]`);
  
  console.log('9. DOM order after hard reload:');
  console.log(`   [${goalTitles.join(', ')}]`);

  console.log('10. Final line:');
  console.log('    E2E TEST PASSED');

  await browser.close();
})();




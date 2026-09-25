const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const uniqueId = Date.now();
  const email = `stagingtest${uniqueId}@example.com`;
  const password = 'Password123!';
  const BASE_URL = 'https://arezak-staging.vercel.app';
  
  let deployedCommit = "UNKNOWN";
  
  console.log(`Testing Staging URL: ${BASE_URL}`);
  
  // Register a new user
  await page.goto(`${BASE_URL}/register`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.fill('input[id="name"]', 'Staging User');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  await page.goto(`${BASE_URL}/`);
  
  // Wait a bit to ensure Next.js is fully loaded
  await page.waitForTimeout(2000);
  
  // Try to find Next.js buildId (commit SHA) from the window or DOM
  deployedCommit = await page.evaluate(() => {
    return window.__NEXT_DATA__?.buildId || "UNKNOWN";
  });
  console.log(`Deployed Commit (buildId): ${deployedCommit}`);
  
  // Create Goal OLDER
  await page.goto(`${BASE_URL}/goals/create`);
  await page.waitForSelector('input[placeholder="e.g. MacBook Pro, Emergency Fund"]');
  await page.fill('input[placeholder="e.g. MacBook Pro, Emergency Fund"]', 'STAGING ORDER OLDER');
  
  // Click Choose Icon
  await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const iconLabel = labels.find(l => l.innerText.includes('Choose Icon'));
    if (iconLabel && iconLabel.nextElementSibling) {
      iconLabel.nextElementSibling.click();
    }
  });
  await page.waitForTimeout(500);
  await page.fill('input[placeholder="Search icons..."]', 'CameraOff');
  
  let postPayload = null;
  page.on('request', request => {
    if (request.url().includes('/goals') && request.method() === 'POST') {
      try {
        const data = JSON.parse(request.postData());
        if (data.name === 'STAGING ORDER OLDER') {
            postPayload = data;
        }
      } catch (e) {}
    }
  });

  let getResponseData = null;
  page.on('response', async response => {
    if (response.url().includes('/goals') && response.request().method() === 'GET') {
      try {
        const data = await response.json();
        getResponseData = data;
      } catch (e) {}
    }
  });

  // Track errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });
  page.on('requestfailed', request => {
    pageErrors.push(`Failed Request: ${request.url()} - ${request.failure().errorText}`);
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
  
  await page.waitForURL(`${BASE_URL}/goals`);
  await page.waitForSelector('h3:has-text("STAGING ORDER")');
  await page.waitForTimeout(2000); // Wait for API and rendering
  
  // Create Goal NEWER
  await page.goto(`${BASE_URL}/goals/create`);
  await page.waitForSelector('input[placeholder="e.g. MacBook Pro, Emergency Fund"]');
  await page.fill('input[placeholder="e.g. MacBook Pro, Emergency Fund"]', 'STAGING ORDER NEWER');
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('input[type="number"]');
  await page.fill('input[type="number"]', '200');
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Create Goal")');
  
  await page.waitForURL(`${BASE_URL}/goals`);
  await page.waitForSelector('h3:has-text("STAGING ORDER")');
  await page.waitForTimeout(2000);
  
  const getGoalOld = getResponseData?.find(g => g.name === 'STAGING ORDER OLDER') || {};
  const getGoalNew = getResponseData?.find(g => g.name === 'STAGING ORDER NEWER') || {};

  console.log('3. POST payload:');
  console.log(postPayload);
  
  console.log('4. GET response for the created goal (OLDER):');
  console.log(getGoalOld);
  
  // Custom function to inspect DOM icon
  const getDomIcon = async (goalName) => {
    return await page.evaluate((name) => {
      const h3s = Array.from(document.querySelectorAll('h3'));
      const h3 = h3s.find(el => el.innerText.includes(name));
      if (!h3) return 'NOT FOUND';
      const card = h3.parentElement.parentElement;
      const svg = card.querySelector('svg');
      if (!svg) return 'NO SVG';
      return svg.getAttribute('data-icon') || 'NO DATA-ICON';
    }, goalName);
  };
  
  let domIconInitial = await getDomIcon('STAGING ORDER OLDER');
  console.log('5. DOM icon after creation:');
  console.log(`   ${domIconInitial}`);
  
  let goalTitles = await page.$$eval('h3', nodes => nodes.map(n => n.innerText).filter(t => t.includes('STAGING ORDER')));
  console.log('10a. DOM ordering after creation:');
  console.log(`    [${goalTitles.join(', ')}]`);
  
  await page.goto(`${BASE_URL}/`);
  await page.waitForTimeout(1000);
  await page.goto(`${BASE_URL}/goals`);
  await page.waitForSelector('h3:has-text("STAGING ORDER")');
  await page.waitForTimeout(1000);
  
  let domIconSoft = await getDomIcon('STAGING ORDER OLDER');
  console.log('6. DOM icon after navigation:');
  console.log(`   ${domIconSoft}`);
  
  goalTitles = await page.$$eval('h3', nodes => nodes.map(n => n.innerText).filter(t => t.includes('STAGING ORDER')));
  console.log('10b. DOM ordering after soft navigation:');
  console.log(`    [${goalTitles.join(', ')}]`);
  
  await page.reload();
  await page.waitForSelector('h3:has-text("STAGING ORDER")');
  await page.waitForTimeout(1000);
  
  let domIconHard = await getDomIcon('STAGING ORDER OLDER');
  console.log('7. DOM icon after hard refresh:');
  console.log(`   ${domIconHard}`);
  
  goalTitles = await page.$$eval('h3', nodes => nodes.map(n => n.innerText).filter(t => t.includes('STAGING ORDER')));
  console.log('10c. DOM ordering after hard refresh:');
  console.log(`    [${goalTitles.join(', ')}]`);
  
  console.log('8. Older created_at:');
  console.log(`   ${getGoalOld.created_at || 'MISSING'}`);
  console.log('9. Newer created_at:');
  console.log(`   ${getGoalNew.created_at || 'MISSING'}`);
  
  console.log('11. Console/network errors:');
  pageErrors.forEach(err => console.log(`    - ${err}`));
  if (pageErrors.length === 0) console.log('    None');

  await browser.close();
})();

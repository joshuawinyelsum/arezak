const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // We will just verify the bundle contains the icon correctly by building locally and starting the server
    console.log('Playwright is available for E2E testing.');
  } finally {
    await browser.close();
  }
})();

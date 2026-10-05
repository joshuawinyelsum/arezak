const { chromium } = require("playwright");
const assert = require("assert");

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  
  const apiCalls = [];
  page.on("response", async (resp) => {
    const url = resp.url();
    if (url.includes("/api/v1/")) {
      let body = null;
      try { body = await resp.json(); } catch {}
      apiCalls.push({ status: resp.status(), url, body });
      console.log(`<< ${resp.status()} ${url}`);
    }
  });
  page.on("console", msg => {
    if (msg.type() === "error") console.log(`PAGE ERR: ${msg.text()}`);
  });

  const ts = Date.now();
  const email = `full_test_${ts}@example.com`;
  const phone = `+23355${Math.floor(1000000 + Math.random()*9000000)}`;
  const pw = "Password123!";
  const handle = `fulltest${ts}`;

  try {
    // Register fresh user with handle
    await page.goto("https://arezak-staging.vercel.app/register");
    await page.waitForSelector('input[type="email"]');
    const textInputs = await page.$$('input[type="text"]');
    await textInputs[0].fill("Full");
    await textInputs[1].fill("Test");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="tel"]', phone);
    await page.fill('input[placeholder="username"]', handle);
    const pInputs = await page.$$('input[type="password"]');
    await pInputs[0].fill(pw);
    await pInputs[1].fill(pw);
    await page.click('button[type="submit"]');
    await page.waitForURL("https://arezak-staging.vercel.app/", { timeout: 20000 });
    console.log("Dashboard URL reached:", page.url());

    // Wait for all network to settle
    await page.waitForLoadState("networkidle");
    
    // Check if API calls succeeded
    const accCall = apiCalls.find(c => c.url.includes("/accounts"));
    const txCall = apiCalls.find(c => c.url.includes("/transactions"));
    const goalCall = apiCalls.find(c => c.url.includes("/goals"));
    
    console.log("\nAPI Results:");
    console.log("Accounts:", accCall ? `HTTP ${accCall.status}` : "NOT CALLED", JSON.stringify(accCall?.body)?.slice(0,200));
    console.log("Transactions:", txCall ? `HTTP ${txCall.status}` : "NOT CALLED", JSON.stringify(txCall?.body)?.slice(0,200));
    console.log("Goals:", goalCall ? `HTTP ${goalCall.status}` : "NOT CALLED", JSON.stringify(goalCall?.body)?.slice(0,200));

    // Check the page body text for "Complete onboarding" or "Unable to load"
    const body = await page.textContent("body");
    if (body.includes("Complete onboarding")) {
      console.log("\n!!! PAGE SHOWS: Complete onboarding phase !!!");
    }
    if (body.includes("Unable to load dashboard")) {
      console.log("!!! PAGE SHOWS: Unable to load dashboard !!!");
    }
    if (body.includes("Good morning")) {
      console.log("Dashboard loaded successfully");
    }
    
    // Check OTPs were NOT called
    const otpCalled = apiCalls.some(c => c.url.includes("otp") || c.url.includes("verify-phone"));
    assert(!otpCalled, "OTP endpoint was called during login!");
    console.log("\nNo OTP endpoints called. OK.");
    
  } catch(e) {
    console.error("ERROR:", e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

import { test, expect } from "@playwright/test";

test("inspect vercel staging", async ({ page }) => {
  const reqs: string[] = [];
  page.on("request", req => reqs.push(req.url()));
  page.on("response", res => console.log("RES:", res.status(), res.url()));
  page.on("console", msg => console.log("LOG:", msg.text()));
  page.on("pageerror", err => console.log("ERR:", err.message));

  await page.goto("https://arezak-staging.vercel.app", { timeout: 15000 }).catch(e => console.log("GOTO ERR:", e.message));
  await page.waitForTimeout(5000);
  
  console.log("FINAL URL:", page.url());
  console.log("REQUESTS:", reqs.filter(u => u.includes('/api/v1')));
  
  const content = await page.innerHTML("body");
  console.log("BODY LEN:", content.length);
});

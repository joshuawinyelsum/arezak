import { test, expect } from '@playwright/test';

const userA = {
  name: 'AliceStep11',
  email: `a.step11.${Date.now()}@example.com`,
  password: 'password123',
  goalName: 'MacBook',
  goalAmount: '500.00'
};

const userB = {
  name: 'BobStep11',
  email: `b.step11.${Date.now()}@example.com`,
  password: 'password123',
  goalName: 'School'
};

test.describe('Step 11: End-to-End Financial Integrity Audit', () => {

  test('User A - Full Financial Lifecycle', async ({ page }) => {
    // 3. TEST USER A
    // Register
    await page.goto('/register');
    await page.fill('input[type="text"]', userA.name);
    await page.fill('input[type="email"]', userA.email);
    await page.fill('input[type="password"]', userA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Check initial state (Dashboard)
    await expect(page.getByText('Good morning, AliceStep11')).toBeVisible();
    await expect(page.getByText('GH₵ 0.00').first()).toBeVisible(); // Empty balance
    
    // Check Accounts
    await page.goto('/accounts');
    await expect(page.getByText('GH₵ 0.00').first()).toBeVisible();
    await expect(page.getByText('Main Account')).toBeVisible(); // Default account exists
    
    // Check Transactions
    await page.goto('/transactions');
    await expect(page.getByText('No transactions')).toBeVisible();
    
    // Check Goals
    await page.goto('/goals');
    await expect(page.getByText('No goals yet')).toBeVisible();
    
    // 4. TEST USER A - INCOME
    await page.goto('/transactions');
    await page.locator('button[aria-label="Fund Account"]').evaluate(node => (node as HTMLButtonElement).click());
    await page.fill('input[placeholder="0.00"]', '1000.00');
    await page.fill('input[placeholder="e.g. September allowance"]', 'Step11 Income');
    // For source, we can just use default (Salary)
    await page.locator('button:has-text("Fund Account")').nth(1).evaluate(node => (node as HTMLButtonElement).click());

    // Use the <select> element to choose the first account
    // Skip checking 'Salary' as it's a hidden <option> in a <select> element
    
    // Refresh browser
    await page.reload();
    await expect(page.getByText('Step11 Income')).toBeVisible();
    
    // Verify Dashboard
    await page.goto('/');
    await expect(page.getByText('GH₵ 1,000.00').first()).toBeVisible();
    
    // Verify Accounts
    await page.goto('/accounts');
    await expect(page.getByText('GH₵ 1,000.00').first()).toBeVisible();

    // 5. TEST USER A — EXPENSE
    await page.goto('/transactions');
    await page.locator('button[aria-label="Add Expense"]').evaluate(node => (node as HTMLButtonElement).click());
    await page.fill('input[placeholder="What was this for?"]', 'Step11 Expense');
    await page.fill('input[placeholder="0.00"]', '100.00');
    await page.locator('button:has-text("Record Expense")').evaluate(node => (node as HTMLButtonElement).click());
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Step11 Expense')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Step11 Expense')).toBeVisible();
    
    // Verify updated balance (1000 - 100 = 900)
    await page.goto('/');
    await expect(page.getByText('GH₵ 900.00').first()).toBeVisible();
    
    await page.goto('/accounts');
    await expect(page.getByText('GH₵ 900.00').first()).toBeVisible();

    // 6. TEST USER A — CREATE GOAL
    await page.goto('/goals/create');
    await page.fill('input[placeholder="e.g. MacBook Pro M3"]', userA.goalName);
    await page.fill('input[placeholder="2000.00"]', userA.goalAmount);
    await page.locator('button:has-text("Create Goal")').evaluate(node => (node as HTMLButtonElement).click());
    await page.waitForURL('**/goals');
    
    await expect(page.getByText(userA.goalName).first()).toBeVisible();

    // 7. TEST USER A — CONTRIBUTION
    await page.getByRole('button', { name: 'Contribute' }).evaluate(node => (node as HTMLButtonElement).click());
    await page.fill('input[placeholder="0.00"]', '200.00');
    await page.locator('button:has-text("Confirm Contribution")').evaluate(node => (node as HTMLButtonElement).click());
    await page.waitForTimeout(500);
    
    // Verify Goals page updates to 200 / 500
    await expect(page.getByText('GH₵ 200.00 / 500.00').first()).toBeVisible();
    
    // Verify Accounts (Available: 900 - 200 = 700, Locked: 200)
    await page.goto('/accounts');
    await expect(page.getByText('GH₵ 700.00').first()).toBeVisible(); // Available
    await expect(page.getByText('GH₵ 200.00').first()).toBeVisible(); // Locked
    
    // 8. TEST USER A — OVERFUNDING
    await page.goto('/goals');
    await page.getByRole('button', { name: 'Contribute' }).evaluate(node => (node as HTMLButtonElement).click());
    await page.fill('input[placeholder="0.00"]', '400.00'); // Goal capacity is 300
    await page.locator('button:has-text("Confirm Contribution")').evaluate(node => (node as HTMLButtonElement).click());
    await page.waitForTimeout(500);
    
    // Expect error message in modal
    await expect(page.getByText('API error: 400')).toBeVisible();
    // Modal stays open, navigate away

    // 9. TEST USER A — INSUFFICIENT AVAILABLE FUNDS
    await page.goto('/transactions');
    await page.locator('button[aria-label="Add Expense"]').evaluate(node => (node as HTMLButtonElement).click());
    await page.fill('input[placeholder="What was this for?"]', 'Too Expensive');
    await page.fill('input[placeholder="0.00"]', '800.00'); // Available is 700
    await page.locator('button:has-text("Record Expense")').evaluate(node => (node as HTMLButtonElement).click());
    await page.waitForTimeout(500);
    
    // The backend rejects it. Wait for error message (which shows in a toast or modal).
    // The UI should show insufficient funds
    await expect(page.getByText('API error: 400')).toBeVisible();
    // Navigate away

    // Verify balances did not change
    await page.goto('/accounts');
    await expect(page.getByText('GH₵ 700.00').first()).toBeVisible(); 

    // 10. TEST USER A — ACHIEVEMENT
    await page.goto('/goals');
    await page.getByRole('button', { name: 'Contribute' }).evaluate(node => (node as HTMLButtonElement).click());
    await page.fill('input[placeholder="0.00"]', '300.00');
    await page.locator('button:has-text("Confirm Contribution")').evaluate(node => (node as HTMLButtonElement).click());
    await page.waitForTimeout(500);
    
    // Wait for Achieved badge
    await expect(page.getByText('Achieved').first()).toBeVisible();
    
    // Verify Dashboard summary
    await page.goto('/');
    // Check available balance is now 700 - 300 = 400
    await expect(page.getByText('GH₵ 400.00').first()).toBeVisible();

    // 11. TEST USER A — RELEASE
    await page.goto('/goals');
    await page.getByRole('button', { name: 'Release Funds' }).evaluate(node => (node as HTMLButtonElement).click());
    await page.locator('button:has-text("Release Funds Now")').evaluate(node => (node as HTMLButtonElement).click());
    
    // Expect status to change to Released
    await expect(page.getByText('Released').first()).toBeVisible();
    
    // Verify Available Balance recovered (400 + 500 = 900)
    await page.goto('/accounts');
    await expect(page.getByText('GH₵ 900.00').first()).toBeVisible();
    
    // Check transactions to see release transaction exists (if it creates one)
    // Actually, release creates a ledger entry of type 'RELEASE' which doesn't affect transaction UI directly, 
    // it just transfers locked to available.

    // 18. LOGOUT
    await page.context().clearCookies();
    await page.goto('/login');
    
    // Login User A again
    await page.fill('input[type="email"]', userA.email);
    await page.fill('input[type="password"]', userA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Real state returns
    await expect(page.getByText('GH₵ 900.00').first()).toBeVisible();
  });

  test('User B - Workflow and Isolation', async ({ browser, page }) => {
    // 19. TEST USER B
    await page.goto('/register');
    await page.fill('input[type="text"]', userB.name);
    await page.fill('input[type="email"]', userB.email);
    await page.fill('input[type="password"]', userB.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Income GH₵400
    await page.goto('/transactions');
    await page.locator('button[aria-label="Fund Account"]').evaluate(node => (node as HTMLButtonElement).click());
    await page.fill('input[placeholder="0.00"]', '400.00');
    // Note: for User B Income, we just add a note
    await page.fill('input[placeholder="e.g. September allowance"]', 'User B Income');
    await page.locator('button:has-text("Fund Account")').nth(1).evaluate(node => (node as HTMLButtonElement).click());
    await page.waitForTimeout(500);
    
    // Expense GH₵50
    await page.locator('button[aria-label="Add Expense"]').evaluate(node => (node as HTMLButtonElement).click());
    await page.fill('input[placeholder="What was this for?"]', 'User B Expense');
    await page.fill('input[placeholder="0.00"]', '50.00');
    await page.locator('button:has-text("Record Expense")').evaluate(node => (node as HTMLButtonElement).click());
    await page.waitForTimeout(500);
    
    // Goal "School"
    await page.goto('/goals/create');
    await page.fill('input[placeholder="e.g. MacBook Pro M3"]', userB.goalName);
    await page.fill('input[placeholder="2000.00"]', '1000.00');
    await page.locator('button:has-text("Create Goal")').evaluate(node => (node as HTMLButtonElement).click());
    await page.waitForURL('**/goals');
    
    // Assert B sees ONLY B's data
    await page.goto('/');
    await expect(page.getByText('Good morning, BobStep11')).toBeVisible();
    await expect(page.getByText('GH₵ 350.00').first()).toBeVisible(); // 400 - 50 = 350
    await expect(page.getByText(userA.goalName)).not.toBeVisible();
    await expect(page.getByText('Step11 Expense')).not.toBeVisible();

    // 21. FAILED CROSS-USER MUTATION
    // User B is logged into `page`. Attacker will be logged into `pageA`.
    const attacker = { name: 'Attacker', email: `attacker.${Date.now()}@example.com`, password: 'password123' };
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto('/register');
    await pageA.fill('input[type="text"]', attacker.name);
    await pageA.fill('input[type="email"]', attacker.email);
    await pageA.fill('input[type="password"]', attacker.password);
    await pageA.click('button[type="submit"]');
    await pageA.waitForURL('**/');
    
    // Get B's actual account via B's page
    const resBAuth = await page.request.get(`${process.env.API_URL || 'http://localhost:8000/api/v1'}/accounts`, {
        headers: { 'x-requested-with': 'XMLHttpRequest' }
    });
    const dataB = await resBAuth.json();
    const accountBId = dataB[0].id;
    
    // User A attacks B's account
    const apiUrl = process.env.API_URL || 'http://localhost:8000/api/v1';
    const attackRes = await pageA.request.post(`${apiUrl}/transactions/expense`, {
      headers: { 'x-requested-with': 'XMLHttpRequest' },
      data: {
        account_id: accountBId, // Using B's account ID
        amount: {
          amount_pesewas: 1000,
          currency: 'GHS'
        },
        description: 'Hacked'
      }
    });
    
    expect(attackRes.status()).toBe(400);
    
    // Verify B's balance is intact
    await page.goto('/');
    await expect(page.getByText('GH₵ 350.00').first()).toBeVisible();
  });
});

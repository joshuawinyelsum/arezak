import { test, expect } from '@playwright/test';

const userA = {
  email: `usera_${Date.now()}@test.com`,
  password: 'Password123!',
  name: 'Alice E2E',
  accountName: 'Alice Main',
  incomeAmount: '1000',
  expenseAmount: '100',
  goalName: 'MacBook Pro',
  goalAmount: '2000'
};

const userB = {
  email: `userb_${Date.now()}@test.com`,
  password: 'Password123!',
  name: 'Bob E2E',
  accountName: 'Bob Main',
  incomeAmount: '400',
  expenseAmount: '50',
  goalName: 'School Supplies',
  goalAmount: '150'
};

test.describe.configure({ mode: 'serial' });

test.describe('Cross-User Isolation', () => {

  test('Setup users and seed data', async ({ request, page }) => {
    // We register User A
    await page.goto('/register');
    await page.fill('input[id="name"]', userA.name);
    await page.fill('input[type="email"]', userA.email);
    await page.fill('input[type="password"]', userA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Create Income for A
    await page.goto('/transactions');
    await page.locator('button[aria-label="Fund Account"]').evaluate(node => (node as HTMLButtonElement).click());
    await page.fill('input[placeholder="0.00"]', userA.incomeAmount);
    await page.fill('input[placeholder="e.g. September allowance"]', 'User A Salary');
    
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/transactions/income')),
      page.locator('button:has-text("Fund Account")').nth(1).evaluate(node => (node as HTMLButtonElement).click())
    ]);
    
    if (!response.ok()) {
      const errorText = await response.text();
      console.error('Transaction failed:', response.status(), errorText);
    }
    
    await expect(page.getByText('User A Salary')).toBeVisible();

    // Create Expense for A
    await page.click('button[aria-label="Add Expense"]');
    await page.fill('input[placeholder="What was this for?"]', 'User A Expense');
    await page.fill('input[placeholder="0.00"]', userA.expenseAmount);
    
    const [responseExp] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/transactions/expense')),
      page.locator('button:has-text("Submit Expense")').evaluate(node => (node as HTMLButtonElement).click())
    ]);
    
    if (!responseExp.ok()) {
      const errorText = await responseExp.text();
      console.error('Expense failed:', responseExp.status(), errorText);
    }
    
    await expect(page.getByText('User A Expense')).toBeVisible();

    // Create Goal for A
    await page.goto('/goals/create');
    await page.fill('input[placeholder="e.g. MacBook Pro M3"]', userA.goalName);
    await page.fill('input[placeholder="2000.00"]', userA.goalAmount);
    await page.locator('button:has-text("Create Goal")').evaluate(node => (node as HTMLButtonElement).click());
    await page.waitForURL('**/goals');
    await expect(page.getByText(userA.goalName).first()).toBeVisible();

    // Logout User A securely (handles both Mobile and Desktop)
    await page.context().clearCookies();
    await page.goto('/login');

    // Register User B
    await page.goto('/register');
    await page.fill('input[id="name"]', userB.name);
    await page.fill('input[type="email"]', userB.email);
    await page.fill('input[type="password"]', userB.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Create Income for B
    await page.goto('/transactions');
    await page.locator('button[aria-label="Fund Account"]').evaluate(node => (node as HTMLButtonElement).click());
    await page.fill('input[placeholder="0.00"]', userB.incomeAmount);
    await page.fill('input[placeholder="e.g. September allowance"]', 'User B Salary');
    await page.locator('button:has-text("Fund Account")').nth(1).evaluate(node => (node as HTMLButtonElement).click());
    await expect(page.getByText('User B Salary')).toBeVisible();

    // Create Expense for B
    await page.click('button[aria-label="Add Expense"]');
    await page.fill('input[placeholder="What was this for?"]', 'User B Expense');
    await page.fill('input[placeholder="0.00"]', userB.expenseAmount);
    await page.locator('button:has-text("Submit Expense")').evaluate(node => (node as HTMLButtonElement).click());
    await expect(page.getByText('User B Expense')).toBeVisible();

    // Create Goal for B
    await page.goto('/goals/create');
    await page.fill('input[placeholder="e.g. MacBook Pro M3"]', userB.goalName);
    await page.fill('input[placeholder="2000.00"]', userB.goalAmount);
    await page.locator('button:has-text("Create Goal")').evaluate(node => (node as HTMLButtonElement).click());
    await page.waitForURL('**/goals');
    await expect(page.getByText(userB.goalName)).toBeVisible();

    // Logout B
    await page.context().clearCookies();
    await page.goto('/login');
  });

  test('Verify User A Isolation', async ({ page }) => {
    // Login User A
    await page.goto('/login');
    await page.fill('input[type="email"]', userA.email);
    await page.fill('input[type="password"]', userA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Dashboard
    await expect(page.getByText('Good morning, Alice')).toBeVisible();
    await expect(page.getByText('GH₵ 900.00').first()).toBeVisible(); // 1000 - 100 = 900
    // Note: Goal widget is hidden on mobile, so we don't assert it here.
    await expect(page.getByText('User A Salary')).toBeVisible();
    await expect(page.getByText('User B Salary')).not.toBeVisible();
    
    // Accounts
    await page.goto('/accounts');
    await expect(page.getByText('GH₵ 900.00').first()).toBeVisible();
    
    // Transactions
    await page.goto('/transactions');
    await expect(page.getByText('User A Salary')).toBeVisible();
    await expect(page.getByText('User A Expense')).toBeVisible();
    await expect(page.getByText('User B Salary')).not.toBeVisible();
    
    // Goals
    await page.goto('/goals');
    await expect(page.getByText(userA.goalName).first()).toBeVisible();
    await expect(page.getByText(userB.goalName)).not.toBeVisible();
  });

  test('Verify User B Isolation (Logout -> Login B)', async ({ page }) => {
    // Login User A, then logout, then login User B
    await page.goto('/login');
    await page.fill('input[type="email"]', userA.email);
    await page.fill('input[type="password"]', userA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Logout
    await page.goto('/settings');
    await page.context().clearCookies();
    await page.goto('/login');
    
    // Login User B
    await page.fill('input[type="email"]', userB.email);
    await page.fill('input[type="password"]', userB.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Dashboard
    await expect(page.getByText('Good morning, Bob')).toBeVisible();
    await expect(page.getByText('GH₵ 350.00').first()).toBeVisible(); // 400 - 50 = 350
    // await expect(page.getByText(userB.goalName)).toBeVisible(); // Hidden on mobile dashboard
    await expect(page.getByText('User B Salary')).toBeVisible();
    
    // Ensure User A's data is ABSENT
    await expect(page.getByText('Alice').first()).not.toBeVisible();
    await expect(page.getByText('GH₵ 900.00')).not.toBeVisible();
    await expect(page.getByText(userA.goalName)).not.toBeVisible();
    await expect(page.getByText('User A Salary')).not.toBeVisible();
    
    // Transactions
    await page.goto('/transactions');
    await expect(page.getByText('User B Salary')).toBeVisible();
    await expect(page.getByText('User A Salary')).not.toBeVisible();
  });

  test('Direct URL and Hard Refresh Test', async ({ page }) => {
    // Login User B
    await page.goto('/login');
    await page.fill('input[type="email"]', userB.email);
    await page.fill('input[type="password"]', userB.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Hard refresh on dashboard
    await page.reload();
    await expect(page.getByText('Good morning, Bob')).toBeVisible();
    await expect(page.getByText(userA.goalName)).not.toBeVisible();
    
    // Direct URL to accounts
    await page.goto('/accounts');
    await page.reload();
    await expect(page.getByText('GH₵ 350.00').first()).toBeVisible();
    await expect(page.getByText('GH₵ 900.00')).not.toBeVisible();
    
    // Direct URL to transactions
    await page.goto('/transactions');
    await page.reload();
    await expect(page.getByText('User B Salary')).toBeVisible();
    await expect(page.getByText('User A Salary')).not.toBeVisible();
  });

  test('Back/Forward Navigation Test', async ({ page }) => {
    // Login A
    await page.goto('/login');
    await page.fill('input[type="email"]', userA.email);
    await page.fill('input[type="password"]', userA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    await expect(page.getByText('Good morning, Alice')).toBeVisible();
    
    // Visit Accounts as A
    await page.goto('/accounts');
    await expect(page.getByText('GH₵ 900.00').first()).toBeVisible();
    
    // Visit Dashboard as A
    await page.goto('/');
    
    // Logout A
    await page.goto('/settings');
    await page.context().clearCookies();
    await page.goto('/login');
    
    // Login B
    await page.fill('input[type="email"]', userB.email);
    await page.fill('input[type="password"]', userB.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    await expect(page.getByText('Good morning, Bob')).toBeVisible();
    
    // Use page.goBack() multiple times to travel back through history
    // We expect it to NEVER show A's data. If it goes back to /accounts, it must fetch B's data
    await page.goBack(); // Back to login (should redirect to /)
    await page.waitForTimeout(500);
    await page.goBack(); // Back to settings (should be ok)
    await page.waitForTimeout(500);
    await page.goBack(); // Back to / as A (but we are B, so it should be Bob's dashboard)
    await page.waitForTimeout(500);
    await page.goBack(); // Back to /accounts
    
    // Assert we see B's accounts, not A's
    await expect(page.getByText('Alice').first()).not.toBeVisible();
    await expect(page.getByText('GH₵ 900.00')).not.toBeVisible();
    
    // Now go forward
    await page.goForward();
    await expect(page.getByText('Alice').first()).not.toBeVisible();
    await expect(page.getByText('GH₵ 900.00')).not.toBeVisible();
  });
  
  test('Slow Load / Stale State Test', async ({ page }) => {
    // Login A
    await page.goto('/login');
    await page.fill('input[type="email"]', userA.email);
    await page.fill('input[type="password"]', userA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    await expect(page.getByText('Good morning, Alice')).toBeVisible();
    
    // Delay API routes for User B to ensure loading state shows instead of stale A data
    await page.route('**/api/v1/accounts', async route => {
      await new Promise(f => setTimeout(f, 2000));
      await route.continue();
    });
    
    await page.context().clearCookies();
    await page.goto('/login');
    
    // Login B
    await page.fill('input[type="email"]', userB.email);
    await page.fill('input[type="password"]', userB.password);
    await page.click('button[type="submit"]');
    
    // We are routed to Dashboard. The accounts request is delayed. 
    // Wait for the loader to be visible, then disappear
    await expect(page.getByText('Loading')).toBeVisible();
    await expect(page.getByText('Alice').first()).not.toBeVisible(); // A's data must NOT be visible during B's load
    await expect(page.getByText('GH₵ 900.00')).not.toBeVisible(); 
    
    await expect(page.getByText('Good morning, Bob')).toBeVisible({ timeout: 5000 });
  });
  
  test('Cross-User API Attack (Mutation)', async ({ browser, page }) => {
    // Login User A
    await page.goto('/login');
    await page.fill('input[type="email"]', userA.email);
    await page.fill('input[type="password"]', userA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Get B's account ID via a completely isolated browser context
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto('/login');
    await pageB.fill('input[type="email"]', userB.email);
    await pageB.fill('input[type="password"]', userB.password);
    await pageB.click('button[type="submit"]');
    await pageB.waitForURL('**/');
    
    // Now get B's accounts via pageB's request
    const accountsResB = await pageB.request.get('http://localhost:8000/api/v1/accounts', {
        headers: { 'x-requested-with': 'XMLHttpRequest' }
    });
    const accountsB = await accountsResB.json();
    const accountIdB = accountsB[0].id;
    
    // Now User A tries to mutate User B's account. We use page.request which is already authenticated as User A.
    const attackRes = await page.request.post('http://localhost:8000/api/v1/transactions/income', {
      data: {
        account_id: accountIdB,
        amount_pesewas: 500000,
        description: 'Hacked Income'
      },
      headers: {
        'x-requested-with': 'XMLHttpRequest'
      }
    });
    
    // The backend MUST reject this because User A does not own accountBId
    expect(attackRes.ok()).toBeFalsy();
    
    // Verify B's balance is unchanged
    const verifyResB = await pageB.request.get('http://localhost:8000/api/v1/accounts', {
        headers: { 'x-requested-with': 'XMLHttpRequest' }
    });
    const verifyAccountsB = await verifyResB.json();
    expect(verifyAccountsB[0].available_balance.amount_pesewas).toBe(35000); // 350.00 GHc
  });

  test('Fresh User Empty State', async ({ page }) => {
    const userC = {
      email: `userc_${Date.now()}@test.com`,
      password: 'Password123!',
      name: 'Charlie Fresh'
    };
    
    await page.goto('/register');
    await page.fill('input[id="name"]', userC.name);
    await page.fill('input[type="email"]', userC.email);
    await page.fill('input[type="password"]', userC.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    
    // Dashboard should have 0s
    await expect(page.getByText('Good morning, Charlie')).toBeVisible();
    await expect(page.getByText('GH₵ 0.00').first()).toBeVisible();
    await expect(page.getByText('No recent transactions')).toBeVisible();
    
    // Accounts
    await page.goto('/accounts');
    await expect(page.getByText('GH₵ 0.00').first()).toBeVisible();
    
    // Transactions
    await page.goto('/transactions');
    await expect(page.getByText('No transactions').first()).toBeVisible();
    
    // Goals
    await page.goto('/goals');
    await expect(page.getByText('No goals yet').first()).toBeVisible();
  });
});

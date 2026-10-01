with open("frontend/e2e/block7.spec.ts", "r", encoding="utf-8") as f:
    c = f.read()

apple_test = """
  test('APPLE: Secure State Verification and API payload', async ({ page }) => {
    // Mock Apple config
    await page.route('**/api/v1/auth/social', async route => {
      const body = JSON.parse(route.request().postData()!);
      expect(body.provider).toBe('apple');
      expect(body.token).toBe('mock_id_token');
      expect(body.code).toBe('mock_code');
      expect(body.nonce).toBeTruthy(); // Should have passed the raw nonce
      await route.fulfill({ status: 200, json: { message: "Success" } });
    });
    
    // Set up mock window.AppleID object before page load
    await page.addInitScript(() => {
      Object.defineProperty(window, 'process', {
        value: { env: { NEXT_PUBLIC_APPLE_CLIENT_ID: "mock_client" } }
      });
      
      window.AppleID = {
        auth: {
          init: () => {},
          signIn: async (options: any) => {
             // Mock returned response with matching state
             return {
                authorization: {
                   state: options.state,
                   id_token: "mock_id_token",
                   code: "mock_code"
                },
                user: {
                   name: { firstName: "Apple", lastName: "User" },
                   email: "apple@example.com"
                }
             };
          }
        }
      };
    });
    
    await page.goto('/login');
    const appleBtn = page.getByRole('button', { name: /Continue with Apple/i });
    await expect(appleBtn).toBeVisible();
    await appleBtn.click();
    
    // We expect it to succeed and call /auth/social (intercepted above)
    // To verify mismatched state rejection:
    await page.addInitScript(() => {
      window.AppleID.auth.signIn = async (options: any) => {
         return {
            authorization: {
               state: "mismatched_state_attacker",
               id_token: "mock_id_token"
            }
         };
      };
    });
    
    await page.goto('/login');
    const appleBtn2 = page.getByRole('button', { name: /Continue with Apple/i });
    await appleBtn2.click();
    
    await expect(page.getByText(/State verification failed/i)).toBeVisible();
  });
"""

if "APPLE: Secure State Verification" not in c:
    c = c.replace("});", apple_test + "\n});")

with open("frontend/e2e/block7.spec.ts", "w", encoding="utf-8") as f:
    f.write(c)

with open("frontend/e2e/block7.spec.ts", "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace(
    """    // We expect it to succeed and call /auth/social (intercepted above)
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
    await appleBtn2.click();""",
    """    // We expect it to succeed and call /auth/social (intercepted above)
    // To verify mismatched state rejection:
    await page.evaluate(() => {
      (window as any).AppleID.auth.signIn = async (options: any) => {
         return {
            authorization: {
               state: "mismatched_state_attacker",
               id_token: "mock_id_token"
            }
         };
      };
    });
    
    // The button is still on the screen because we stayed on /login
    await appleBtn.click();"""
)

with open("frontend/e2e/block7.spec.ts", "w", encoding="utf-8") as f:
    f.write(c)

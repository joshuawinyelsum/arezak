import asyncio
from playwright.async_api import async_playwright
import uuid
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.account import Account
from app.services.transaction_service import process_income

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        email = f"e2e_{uuid.uuid4()}@example.com"
        password = "Password123!"
        
        # 1. Register & Seed DB
        db = SessionLocal()
        from app.services.auth_service import create_user
        user = create_user(db, "E2E User", email, password)
        account = db.query(Account).filter(Account.user_id == user.id).first()
        process_income(db, user.id, account.id, 1000000, "GHS", f"init_{uuid.uuid4()}") # 10,000 GHS
        db.commit()
        db.close()
        
        print(f"Created user {email} with funded account.")
        
        # Login via UI
        URL = "http://localhost:3003"
        await page.goto(f"{URL}/login")
        await page.fill('input[type="email"]', email)
        await page.fill('input[type="password"]', password)
        await page.click('button[type="submit"]')
        await page.wait_for_url(f"{URL}/")
        print("Logged in successfully.")
        
        # Create goal at 4500
        await page.goto(f"{URL}/goals")
        await page.click('text="Create Goal"')
        await page.fill('input[type="text"]', "E2E Test Goal")
        await page.fill('input[type="number"]', "4500")
        await page.click('button:has-text("Create Goal")')
        await page.wait_for_selector('text="E2E Test Goal"')
        print("1. Created goal at GH?4,500")
        
        # Edit 4500 -> 3000
        await page.click('button:has-text("Edit")')
        await page.fill('input[type="number"]', "3000")
        await page.click('button:has-text("Save Changes")')
        await page.wait_for_selector('text="GH? 3,000.00"')
        print("2. Edited GH?4,500 -> GH?3,000")
        
        # Edit 3000 -> 6000
        await page.click('button:has-text("Edit")')
        await page.fill('input[type="number"]', "6000")
        await page.click('button:has-text("Save Changes")')
        await page.wait_for_selector('text="GH? 6,000.00"')
        print("3. Edited GH?3,000 -> GH?6,000")
        
        # Reach target (fund 6000)
        await page.click('button:has-text("Contribute")')
        await page.fill('input[type="number"]', "6000")
        await page.click('button:has-text("Confirm Funding")')
        await page.wait_for_selector('text="Achieved"')
        print("4 & 5. Reached target and verified goal becomes ACHIEVED")
        
        # Verify View Goal opens the actual detail view
        await page.click('text="View Goal"')
        await page.wait_for_url(f"{URL}/goals/**")
        await page.wait_for_selector('text="E2E Test Goal"')
        print("6 & 7. Verified achieved goal remains retrievable and View Goal opens actual detail view")
        
        # Verify appropriate actions for an achieved goal
        await page.wait_for_selector('button:has-text("Release Funds")')
        print("8. Verified Release Funds action exists")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())

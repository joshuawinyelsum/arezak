
import pytest
import uuid
from app.core.config import settings

def test_funding_and_correction_flow(client):
    uid = str(uuid.uuid4())
    headers = {"x-requested-with": "XMLHttpRequest"}
    reg = client.post(f"{settings.API_V1_STR}/auth/register", json={"email": f"u_{uid}@ex.com", "password": "pass", "name": "User"}, headers=headers)
    print("Register response:", reg.json())
    login = client.post(f"{settings.API_V1_STR}/auth/login", json={"email": f"u_{uid}@ex.com", "password": "pass"}, headers=headers)
    print("Login response:", login.json())
    cookies = login.cookies
    
    # Get account
    res = client.get(f"{settings.API_V1_STR}/accounts", cookies=cookies, headers=headers)
    accounts = res.json()
    if not accounts:
        res = client.post(f"{settings.API_V1_STR}/accounts", cookies=cookies, headers=headers, json={"name": "Test Account"})
        accounts = [res.json()]
    account_id = accounts[0]["id"]
    
    # Fund account
    res = client.post(f"{settings.API_V1_STR}/transactions/income", cookies=cookies, headers=headers, json={
        "account_id": account_id,
        "amount": {"amount_pesewas": 5000, "currency": "GHS"},
        "funding_source": "Allowance",
        "note": "Sept allowance"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["funding_source"] == "Allowance"
    assert data["note"] == "Sept allowance"
    
    # Correct transaction
    tx_id = data["id"]
    res = client.post(f"{settings.API_V1_STR}/transactions/{tx_id}/correct", cookies=cookies, headers=headers, json={
        "new_amount": {"amount_pesewas": 2000, "currency": "GHS"}
    })
    assert res.status_code == 200
    
    # Check balance
    res = client.get(f"{settings.API_V1_STR}/accounts", cookies=cookies, headers=headers)
    assert res.json()[0]["available_balance"]["amount_pesewas"] == 2000
    
    # Goal Creation
    res = client.post(f"{settings.API_V1_STR}/goals", cookies=cookies, headers=headers, json={"name": "Goal", "target_amount": 5000})
    goal_id = res.json()["id"]
    
    # Contribute 1000
    res = client.post(f"{settings.API_V1_STR}/goals/{goal_id}/contributions", cookies=cookies, headers=headers, json={
        "amount": 1000, "account_id": account_id
    })
    assert res.status_code == 200
    
    # Check balance: 2000 - 1000 = 1000 available
    res = client.get(f"{settings.API_V1_STR}/accounts", cookies=cookies, headers=headers)
    assert res.json()[0]["available_balance"]["amount_pesewas"] == 1000
    assert res.json()[0]["locked_balance"]["amount_pesewas"] == 1000
    
    # Try to delete funded goal
    res = client.delete(f"{settings.API_V1_STR}/goals/{goal_id}", cookies=cookies, headers=headers)
    assert res.status_code == 400
    assert "locked funds" in res.json()["detail"]
    
    # Untouched Goal Deletion
    res = client.post(f"{settings.API_V1_STR}/goals", cookies=cookies, headers=headers, json={"name": "Empty", "target_amount": 5000})
    empty_goal_id = res.json()["id"]
    res = client.delete(f"{settings.API_V1_STR}/goals/{empty_goal_id}", cookies=cookies, headers=headers)
    assert res.status_code == 200


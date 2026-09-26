import requests
import uuid

API_URL = "https://arezak-staging-c496.up.railway.app/api/v1"
base_headers = {"X-Requested-With": "XMLHttpRequest"}

user_id = str(uuid.uuid4())
email = f"edit_test_{user_id}@example.com"
requests.post(f"{API_URL}/auth/register", json={"email": email, "password": "Password123!", "name": "Edit Test"}, headers=base_headers)

session = requests.Session()
session.post(f"{API_URL}/auth/login", json={"email": email, "password": "Password123!"}, headers=base_headers)

goal_res = session.post(f"{API_URL}/goals", json={
    "name": "Edit Goal",
    "icon": "Target",
    "target_amount": 450000,
    "currency": "GHS",
    "lock_type": "TARGET_REACHED"
}, headers=base_headers)

goal_id = goal_res.json()["id"]

edit1 = session.patch(f"{API_URL}/goals/{goal_id}", json={
    "name": "Edit Goal",
    "icon": "Target",
    "target_amount": 300000
}, headers=base_headers)
print("Edit PATCH:", edit1.status_code, edit1.text)

edit2 = session.put(f"{API_URL}/goals/{goal_id}", json={
    "name": "Edit Goal",
    "icon": "Target",
    "target_amount": 300000
}, headers=base_headers)
print("Edit PUT:", edit2.status_code, edit2.text)


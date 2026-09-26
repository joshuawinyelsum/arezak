import requests
import uuid

API_URL = "https://arezak-staging-c496.up.railway.app/api/v1"
base_headers = {"X-Requested-With": "XMLHttpRequest"}

# 1. Register User
user_id = str(uuid.uuid4())
email = f"api_test_{user_id}@example.com"
register_res = requests.post(f"{API_URL}/auth/register", json={
    "email": email,
    "password": "Password123!",
    "name": "API Test User"
}, headers=base_headers)
print("Register:", register_res.status_code)

# 2. Login
session = requests.Session()
login_res = session.post(f"{API_URL}/auth/login", json={
    "email": email,
    "password": "Password123!"
}, headers=base_headers)
print("Login:", login_res.status_code)
if login_res.status_code != 200:
    print(login_res.text)
    exit(1)

# 3. Create Goal
goal_res = session.post(f"{API_URL}/goals", json={
    "name": "API CONTRACT TEST",
    "icon": "CameraOff",
    "target_amount": 10000,
    "currency": "GHS",
    "lock_type": "TARGET_REACHED",
    "unlock_date": None
}, headers=base_headers)
print("Create Goal:", goal_res.status_code); print("Redirects:", goal_res.history)
goal_data = goal_res.json()
print("icon present:", "icon" in goal_data)
print("created_at present:", "created_at" in goal_data)
if "icon" in goal_data:
    print("icon value:", goal_data["icon"])

# 4. Get Goals
get_res = session.get(f"{API_URL}/goals", headers=base_headers)
print("Get Goals:", get_res.status_code); print("URL:", get_res.url); print(get_res.headers)
get_data = get_res.json()

if len(get_data) > 0:
    g = get_data[0]
    print("GET icon:", g.get("icon"))
    print("GET category:", "category" in g); print("FULL:", g)
















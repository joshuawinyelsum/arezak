import uuid
from app.core.config import settings

def test_goal_categories_flow(client):
    uid = str(uuid.uuid4())
    
    # 1. Register and login User 1
    client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={"email": f"u1_{uid}@example.com", "password": "pass", "name": "User 1"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    login1 = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": f"u1_{uid}@example.com", "password": "pass"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    cookies1 = login1.cookies
    
    # 2. Get system categories
    res = client.get(f"{settings.API_V1_STR}/goal-categories/", cookies=cookies1)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 7
    sys_cat_id = data[0]["id"]
    
    # 3. Create custom category
    res = client.post(
        f"{settings.API_V1_STR}/goal-categories/",
        json={"name": "Custom Category 1", "icon": "Music"},
        cookies=cookies1,
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    assert res.status_code == 201
    custom_cat_id = res.json()["id"]
    
    # 4. Create goal with custom category
    res = client.post(
        f"{settings.API_V1_STR}/goals/",
        json={"name": "My Goal", "target_amount": 1000, "category_id": custom_cat_id},
        cookies=cookies1,
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    assert res.status_code == 200
    assert res.json()["category"]["id"] == custom_cat_id
    
    # 5. Register and login User 2
    client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={"email": f"u2_{uid}@example.com", "password": "pass", "name": "User 2"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    login2 = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": f"u2_{uid}@example.com", "password": "pass"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    cookies2 = login2.cookies
    
    # 6. User 2 should not see User 1's custom category
    res = client.get(f"{settings.API_V1_STR}/goal-categories/", cookies=cookies2)
    assert not any(c["id"] == custom_cat_id for c in res.json())
    
    # 7. User 2 cannot use User 1's custom category
    res = client.post(
        f"{settings.API_V1_STR}/goals/",
        json={"name": "Stolen Category", "target_amount": 1000, "category_id": custom_cat_id},
        cookies=cookies2,
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    assert res.status_code == 400
    assert "Category belongs to another user" in res.json()["detail"]

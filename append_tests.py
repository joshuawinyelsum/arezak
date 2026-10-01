with open("backend/tests/test_block7.py", "a", encoding="utf-8") as f:
    f.write("""
def test_delete_profile_photo(client: TestClient, db_session, monkeypatch):
    from app.services.storage import storage_service
    
    # Mock storage_service to prevent 501
    class MockStorage:
        def delete_profile_photo(self, photo_url: str):
            pass
    
    monkeypatch.setattr("app.api.v1.identity.storage_service", MockStorage())
    
    # Create user directly
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="photodel@example.com",
        password_hash="hash",
        first_name="P",
        last_name="D",
        phone_number="+233240000099",
        handle="photodel",
        phone_verified=True,
        profile_photo_url="https://s3.amazonaws.com/fake/photo.jpg"
    )
    db_session.add(user)
    db_session.commit()
    
    from app.core.security import create_access_token
    token = create_access_token(str(user.id))
    
    res = client.delete(f"{settings.API_V1_STR}/identity/profile/photo", cookies={"access_token": token}, headers={"x-requested-with": "XMLHttpRequest"})
    
    assert res.status_code == 200
    
    db_session.refresh(user)
    assert user.profile_photo_url is None
""")

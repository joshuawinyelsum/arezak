import os

p = 'backend/tests/test_transactions.py'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

fixtures = '''
@pytest.fixture
def test_user(db_session: Session):
    user = User(email=f"test_{uuid.uuid4()}@example.com", name="Test User", password_hash="hashed")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_account(db_session: Session, test_user):
    account = Account(user_id=test_user.id, name="Main Account", type="MAIN", currency="GHS")
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)
    return account

'''
# insert after imports
c = c.replace('from tests.conftest import engine, TestingSessionLocal\n', 'from tests.conftest import engine, TestingSessionLocal\n' + fixtures)

with open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(c)

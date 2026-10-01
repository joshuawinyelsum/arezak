import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.models.base import Base
import app.models  # Import all models to register them in Base.metadata

from app.core.config import settings

# Use PostgreSQL to test real concurrency and row-level locking
# Force pg8000 to avoid Windows App Control DLL blocks if they still occur, 
# or just use the standard driver.
db_url = "sqlite:///:memory:"

engine = create_engine(
    db_url,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)

    
    # Seed system categories for tests
    with engine.begin() as conn:
        from sqlalchemy import text
        
    
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_db

@pytest.fixture
def client():
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()




import uuid
from app.models.user import User
from app.models.account import Account

@pytest.fixture
def test_user(db_session: Session):
    user = User(
        id=uuid.uuid4(),
        email=f"test_{uuid.uuid4()}@example.com",
        first_name="Test", last_name="User", phone_number=f"+233{uuid.uuid4().int % 1000000000:09d}",
        password_hash="hash",
        currency="GHS"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def test_account(db_session: Session, test_user):
    account = Account(
        id=uuid.uuid4(),
        user_id=test_user.id,
        name="Main Account",
        type="MAIN",
        currency="GHS",
        available_balance=0,
        reserved_balance=0,
        locked_balance=0
    )
    db_session.add(account)
    db_session.commit()
    db_session.refresh(account)
    return account

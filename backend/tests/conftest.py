import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.models.base import Base

from app.core.config import settings

# Use PostgreSQL to test real concurrency and row-level locking
# Force pg8000 to avoid Windows App Control DLL blocks if they still occur, 
# or just use the standard driver.
db_url = settings.DATABASE_URL.replace("arezak_db", "arezak_test_db")
if db_url.startswith("sqlite"):
    # If the environment fallback is SQLite, force it to postgres for tests as requested
    db_url = "postgresql+pg8000://arezak:arezak_password@localhost/arezak_test_db"
else:
    db_url = db_url.replace("psycopg", "pg8000") # Use pg8000 for pure python driver compatibility on Windows

engine = create_engine(
    db_url,
    pool_pre_ping=True,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_test_database_if_not_exists(test_db_url: str):
    from sqlalchemy import text
    
    # Extract the base URL (pointing to the default db instead of test db)
    # The default DB in docker-compose is arezak_db
    base_url = test_db_url.replace("arezak_test_db", "arezak_db")
    
    # Create an engine to the default database
    temp_engine = create_engine(base_url, isolation_level="AUTOCOMMIT")
    
    with temp_engine.connect() as conn:
        # Check if the test database exists
        result = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = 'arezak_test_db'")
        ).scalar()
        
        if not result:
            conn.execute(text("CREATE DATABASE arezak_test_db"))
    
    temp_engine.dispose()

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    create_test_database_if_not_exists(db_url)
    
    # Now we can safely bind and create tables in the test database
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



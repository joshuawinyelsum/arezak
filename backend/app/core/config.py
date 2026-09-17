import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Arezak API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7") # Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "arezak")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "arezak_password")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "arezak_db")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development") # development, staging, production
    
    # PostgreSQL is now the standard across all environments (including local)
    DB_DIALECT: str = os.getenv("DB_DIALECT", "postgresql") 
    
    # Force include staging if not present
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000") + ",https://arezak-staging.vercel.app"
    
    @property
    def DATABASE_URL(self) -> str:
        env_db_url = os.getenv("DATABASE_URL")
        if env_db_url:
            if env_db_url.startswith("postgres://"):
                env_db_url = env_db_url.replace("postgres://", "postgresql+psycopg://")
            elif env_db_url.startswith("postgresql://"):
                env_db_url = env_db_url.replace("postgresql://", "postgresql+psycopg://")
            return env_db_url
            
        if self.ENVIRONMENT not in ["development", "staging", "production"]:
            raise ValueError("ENVIRONMENT must be development, staging, or production")
            
        if self.ENVIRONMENT in ["staging", "production"]:
            if self.SECRET_KEY == "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7":
                raise ValueError("SECRET_KEY must be provided via environment in staging/production")
            if self.DB_DIALECT == "sqlite":
                raise ValueError("SQLite cannot be used in staging or production. Please configure POSTGRES_SERVER and set DB_DIALECT=postgresql")
            if self.POSTGRES_SERVER in ["localhost", "127.0.0.1"] and not env_db_url:
                raise ValueError("Staging/Production database cannot be localhost. Please set DATABASE_URL or POSTGRES_SERVER.")
                
        if self.DB_DIALECT == "sqlite":
            return "sqlite:///./arezak.db"
        # Use psycopg driver
        return f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()


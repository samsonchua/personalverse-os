import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "PersonalVerse"
    VERSION: str = "1.0.0-PROTOTYPE"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "personalverse_super_secret_jwt_key_2026_change_in_prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # SQLite fallback for 1-click zero-dependency run, supports PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./personalverse.db")
    
    EODHD_API_KEY: str = os.getenv("EODHD_API_KEY", "")

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    # Comma-separated list of allowed CORS origins; "*" allows any origin (dev default)
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    # Where uploaded documents are stored on disk (mount a volume here in Docker to persist).
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))  # 25 MB default

    model_config = {"case_sensitive": True, "env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()

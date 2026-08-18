import os
import sys
import tempfile
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Point the app at an isolated on-disk SQLite file before anything imports settings/engine.
_TMP_DB = os.path.join(tempfile.gettempdir(), "personalverse_test.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["UPLOAD_DIR"] = os.path.join(tempfile.gettempdir(), "personalverse_test_uploads")

from app.main import app  # noqa: E402
from app.db.session import Base, get_db  # noqa: E402

engine = create_engine(os.environ["DATABASE_URL"], connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def registered_user(client):
    # Unique email per test invocation: tests share one on-disk SQLite file
    # for the whole session, so a fixed email would collide across tests.
    email = f"tester-{uuid.uuid4().hex[:12]}@personalverse.ai"
    payload = {"email": email, "password": "testpass123", "full_name": "Test User"}
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 200, res.text
    return res.json()


@pytest.fixture()
def auth_headers(registered_user):
    token = registered_user["access_token"]
    return {"Authorization": f"Bearer {token}"}

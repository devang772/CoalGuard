"""Tests run on a temporary SQLite file, so Docker/Postgres is not needed for them."""
import os
import tempfile

_tmp_dir = tempfile.mkdtemp(prefix="netra_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_tmp_dir, 'test.db')}"
os.environ["AUTO_BOOTSTRAP"] = "true"
os.environ["JWT_SECRET"] = "test-secret-please-ignore-0123456789"
os.environ["UPLOAD_DIR"] = os.path.join(_tmp_dir, "uploads")
os.environ["ATTENDANCE_ALLOW_MULTIPLE"] = "false"   # tests check the real one-per-day rule
os.environ["SCHEDULER_ENABLED"] = "false"          # tests run jobs by hand with a fake clock
os.environ["AI_MODEL_DIR"] = os.path.join(_tmp_dir, "models")     # never overwrite the dev model file

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

DEMO_PASSWORD = "demo123"


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:   # "with" runs startup: creates tables + starter data
        yield c


@pytest.fixture(scope="session")
def seeded_data(client):
    """21 days of sample activity (generated once per test session)."""
    from app.db import SessionLocal
    from seed.generate import generate
    with SessionLocal() as db:
        return generate(db, days=21, reset=True, seed=42)


@pytest.fixture(scope="session")
def login(client):
    """login("9000000001") -> auth headers for that demo user."""
    cache: dict[str, dict] = {}

    def _login(phone: str) -> dict:
        if phone not in cache:
            r = client.post("/auth/login", json={"phone": phone, "password": DEMO_PASSWORD})
            assert r.status_code == 200, r.text
            cache[phone] = {"Authorization": f"Bearer {r.json()['access_token']}"}
        return cache[phone]

    return _login

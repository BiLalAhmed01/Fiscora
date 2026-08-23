"""Shared pytest fixtures for the backend test suite.

Each test gets a fresh in-memory SQLite database and a FastAPI app that
mounts only the routers under test (never backend.main, which would build
the real multi-agent Team and touch the real on-disk databases). LLM calls
are mocked at the chat-router level (see test_chat.py) so the suite runs
without any provider API keys.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.api.routers import auth, chat, profile, upload
from backend.db.models import Base
from backend.db.session import get_db
from backend.rate_limit import limiter


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """The slowapi Limiter is a module-level singleton (backend.rate_limit)
    shared by every test's app instance, and TestClient requests all appear
    to come from the same synthetic client address -- without resetting its
    counters between tests, whichever test happens to run first would burn
    through the /auth or /chat quota and cause unrelated later tests to see
    429s instead of the responses they're asserting on.
    """
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture()
def db_session_factory():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield sessionmaker(bind=engine)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def app(db_session_factory):
    test_app = FastAPI()
    test_app.state.limiter = limiter
    test_app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    test_app.add_middleware(SlowAPIMiddleware)
    test_app.include_router(auth.router)
    test_app.include_router(profile.router)
    test_app.include_router(upload.router)
    test_app.include_router(chat.router)

    def override_get_db():
        db = db_session_factory()
        try:
            yield db
        finally:
            db.close()

    test_app.dependency_overrides[get_db] = override_get_db

    # chat.py persists chat history via its own module-level SessionLocal
    # (not the get_db dependency, since the generator that needs it may
    # outlive the request-scoped session) -- swap that too, or tests would
    # write into the real on-disk fiscora.db.
    original_session_local = chat.SessionLocal
    chat.SessionLocal = db_session_factory
    try:
        yield test_app
    finally:
        chat.SessionLocal = original_session_local


@pytest.fixture()
def client(app):
    return TestClient(app)


@pytest.fixture()
def signed_up_user(client):
    """Signs up one user and returns (tokens_dict, auth_headers)."""
    resp = client.post("/auth/signup", json={"email": "user@example.com", "password": "supersecret123"})
    assert resp.status_code == 200, resp.text
    tokens = resp.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    return tokens, headers

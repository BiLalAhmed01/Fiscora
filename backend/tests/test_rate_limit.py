"""Proves the slowapi rate limits wired up in backend/main.py (and mirrored
onto the test app in conftest.py) actually trigger a 429 -- not just that the
decorator is present, but that hammering an endpoint past its limit is
rejected.
"""


def test_login_rate_limit_triggers_429_on_sixth_attempt(client):
    payload = {"email": "nobody@example.com", "password": "wrong-password"}

    # /auth/login is limited to 5/minute per client IP. The first 5 requests
    # should each be handled normally (401 for bad creds -- rate limiting
    # doesn't care about the outcome, only the request count).
    for _ in range(5):
        resp = client.post("/auth/login", json=payload)
        assert resp.status_code == 401

    resp = client.post("/auth/login", json=payload)
    assert resp.status_code == 429


def test_signup_rate_limit_triggers_429_on_sixth_attempt(client):
    for i in range(5):
        resp = client.post(
            "/auth/signup", json={"email": f"user{i}@example.com", "password": "supersecret123"}
        )
        assert resp.status_code == 200

    resp = client.post(
        "/auth/signup", json={"email": "user-over-limit@example.com", "password": "supersecret123"}
    )
    assert resp.status_code == 429


def test_requests_under_the_limit_are_not_rate_limited(client):
    for _ in range(4):
        resp = client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong"})
        assert resp.status_code == 401


def test_refresh_has_its_own_bucket_separate_from_login(client):
    """/refresh fires automatically in the background and shouldn't share a
    quota with manual /login attempts -- exhausting login's 5/minute must
    not affect refresh."""
    for _ in range(5):
        resp = client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong"})
        assert resp.status_code == 401
    resp = client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong"})
    assert resp.status_code == 429

    # /refresh is on its own, more generous bucket -- unaffected by login's.
    resp = client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert resp.status_code == 401  # rejected for being invalid, not rate-limited


def test_refresh_rate_limit_triggers_after_thirty_per_minute(client):
    for _ in range(30):
        resp = client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
        assert resp.status_code == 401

    resp = client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert resp.status_code == 429


def test_chat_rate_limit_is_keyed_per_user_not_per_ip(client, monkeypatch):
    """TestClient requests all appear to come from the same synthetic IP --
    proves /chat's limit tracks the authenticated user (via their bearer
    token), not that shared IP, since exhausting one user's quota leaves a
    second user (same IP) unaffected."""
    from backend import config
    from backend.api.routers import chat as chat_module

    monkeypatch.setattr(config, "is_provider_configured", lambda provider: True)

    class _FakeTeam:
        async def arun(self, input, stream, session_id, user_id):
            if False:
                yield None  # pragma: no cover -- makes this an async generator

    monkeypatch.setattr(chat_module, "_get_coordinator_team", lambda: _FakeTeam())

    def _signup(email):
        resp = client.post("/auth/signup", json={"email": email, "password": "supersecret123"})
        assert resp.status_code == 200, resp.text
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}

    user_a_headers = _signup("user-a@example.com")

    for _ in range(20):
        resp = client.post("/chat", headers=user_a_headers, json={"message": "hi"})
        assert resp.status_code == 200

    resp = client.post("/chat", headers=user_a_headers, json={"message": "hi"})
    assert resp.status_code == 429

    # A different authenticated user, same client/IP, still has their own quota.
    user_b_headers = _signup("user-b@example.com")
    resp = client.post("/chat", headers=user_b_headers, json={"message": "hi"})
    assert resp.status_code == 200

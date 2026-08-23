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

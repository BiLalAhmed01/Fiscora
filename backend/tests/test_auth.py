import datetime

from jose import jwt

from backend import config


def test_signup_returns_token_pair(client):
    resp = client.post("/auth/signup", json={"email": "new@example.com", "password": "supersecret123"})
    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"access_token", "refresh_token", "token_type", "expires_in"}
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == config.JWT_EXPIRE_MINUTES * 60


def test_signup_duplicate_email_rejected(client):
    client.post("/auth/signup", json={"email": "dup@example.com", "password": "supersecret123"})
    resp = client.post("/auth/signup", json={"email": "dup@example.com", "password": "anotherpassword"})
    assert resp.status_code == 409


def test_login_success(client):
    client.post("/auth/signup", json={"email": "login@example.com", "password": "correcthorse123"})
    resp = client.post("/auth/login", json={"email": "login@example.com", "password": "correcthorse123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password_rejected(client):
    client.post("/auth/signup", json={"email": "wrongpw@example.com", "password": "correcthorse123"})
    resp = client.post("/auth/login", json={"email": "wrongpw@example.com", "password": "totallywrong"})
    assert resp.status_code == 401


def test_login_unknown_email_rejected(client):
    resp = client.post("/auth/login", json={"email": "nosuchuser@example.com", "password": "whatever123"})
    assert resp.status_code == 401


def test_protected_route_without_token_rejected(client):
    resp = client.get("/profile")
    assert resp.status_code == 401


def test_protected_route_with_invalid_token_rejected(client):
    resp = client.get("/profile", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401


def test_protected_route_with_valid_token_succeeds(client, signed_up_user):
    _tokens, headers = signed_up_user
    resp = client.get("/profile", headers=headers)
    assert resp.status_code == 200


def test_protected_route_with_expired_token_rejected(client, signed_up_user):
    expired = jwt.encode(
        {"sub": "1", "exp": datetime.datetime.utcnow() - datetime.timedelta(minutes=1)},
        config.JWT_SECRET,
        algorithm=config.JWT_ALGORITHM,
    )
    resp = client.get("/profile", headers={"Authorization": f"Bearer {expired}"})
    assert resp.status_code == 401


def test_refresh_rotates_token_and_old_one_stops_working(client, signed_up_user):
    tokens, _headers = signed_up_user
    old_refresh = tokens["refresh_token"]

    resp = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert resp.status_code == 200
    new_tokens = resp.json()
    assert new_tokens["refresh_token"] != old_refresh

    # New access token works.
    new_headers = {"Authorization": f"Bearer {new_tokens['access_token']}"}
    assert client.get("/profile", headers=new_headers).status_code == 200

    # Old refresh token is now dead (rotated out).
    resp = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert resp.status_code == 401


def test_refresh_reuse_revokes_whole_family(client, signed_up_user):
    tokens, _headers = signed_up_user
    old_refresh = tokens["refresh_token"]

    first = client.post("/auth/refresh", json={"refresh_token": old_refresh}).json()

    # Replaying the already-rotated-out token is genuine reuse -- must
    # revoke the entire chain and say so explicitly (distinct from a plain
    # "already revoked" case, since this is the actual attack signal).
    resp = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert resp.status_code == 401
    assert "reuse detected" in resp.json()["detail"]

    # The sibling token swept up by that family-wide revocation was never
    # itself rotated, so replaying it is "already revoked", not "reuse".
    resp = client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert resp.status_code == 401
    assert "revoked" in resp.json()["detail"]
    assert "reuse" not in resp.json()["detail"]


def test_refresh_multi_hop_reuse_revokes_whole_family(client, signed_up_user):
    """Reuse detection must hold across a chain of several rotations, not
    just a single rotate-then-replay -- family_id has to propagate through
    every hop, and replaying a token from PARTWAY through the chain (not
    just the very first one) has to kill even the currently-valid leaf
    token at the end of the chain."""
    tokens, _headers = signed_up_user
    t0 = tokens["refresh_token"]

    r1 = client.post("/auth/refresh", json={"refresh_token": t0})
    assert r1.status_code == 200
    t1 = r1.json()["refresh_token"]

    r2 = client.post("/auth/refresh", json={"refresh_token": t1})
    assert r2.status_code == 200
    t2 = r2.json()["refresh_token"]

    r3 = client.post("/auth/refresh", json={"refresh_token": t2})
    assert r3.status_code == 200
    t3 = r3.json()["refresh_token"]

    # t3 is the current, still-valid leaf of a 4-token chain (t0->t1->t2->t3).
    # Replaying t1 -- a token from the MIDDLE of the chain, two hops back,
    # not the original t0 -- must still be recognized as reuse: family_id
    # has to have propagated correctly through every rotation for this to
    # trigger at all.
    resp = client.post("/auth/refresh", json={"refresh_token": t1})
    assert resp.status_code == 401
    assert "reuse detected" in resp.json()["detail"]

    # The family-wide revocation from that reuse must reach all the way to
    # the current leaf (t3), even though t3 was never itself replayed and
    # was the legitimately-valid token right up until this happened.
    resp = client.post("/auth/refresh", json={"refresh_token": t3})
    assert resp.status_code == 401
    assert "revoked" in resp.json()["detail"]


def test_refresh_unknown_token_rejected(client):
    resp = client.post("/auth/refresh", json={"refresh_token": "not-a-real-refresh-token"})
    assert resp.status_code == 401


def test_logout_revokes_refresh_token(client, signed_up_user):
    tokens, _headers = signed_up_user
    resp = client.post("/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 204

    # A normal post-logout refresh attempt is "revoked", not a reuse/replay
    # accusation -- the token was never rotated, just deliberately killed.
    resp = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Refresh token has been revoked"


def test_logout_unknown_token_is_a_no_op(client):
    resp = client.post("/auth/logout", json={"refresh_token": "never-issued"})
    assert resp.status_code == 204

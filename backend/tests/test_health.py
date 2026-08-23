"""GET /health/ready tests: the happy path (DB reachable) and the DB-down
path (mocked so we don't need an actual broken database to exercise it).
"""
from backend.db.session import get_db


def test_health_ready_ok_when_db_reachable(client):
    resp = client.get("/health/ready")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"


def test_health_ready_returns_503_when_db_unreachable(app, client):
    class _BrokenSession:
        def execute(self, *args, **kwargs):
            raise ConnectionError("simulated database outage")

        def close(self):
            pass

    def _broken_get_db():
        db = _BrokenSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _broken_get_db

    resp = client.get("/health/ready")
    assert resp.status_code == 503
    body = resp.json()
    assert body["status"] == "unavailable"
    assert body["database"] == "unreachable"

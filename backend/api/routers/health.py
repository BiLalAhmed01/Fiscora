"""GET /health/ready -- readiness probe for monitoring/alerting. Confirms
the app can actually reach its database, not just that the process is up.

Deliberately NOT the ALB target group's health check path -- that's the
plain, no-DB-call GET /health defined directly in backend/main.py, chosen so
the load balancer's liveness check can't flap under load or during an
Alembic migration window. /health/ready is for monitoring/alerting that
wants to know about real DB connectivity problems, not for a target group
that would cycle tasks on every blip.
"""
import logging

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.db.session import get_db

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


@router.get("/health/ready")
def health_ready(response: Response, db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        logger.exception("health_check_db_unreachable")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unavailable", "database": "unreachable"}

    return {"status": "ok", "database": "ok"}

"""Fiscora entrypoint: boots Agno's AgentOS (playground + agent/team run
endpoints) and mounts the FastAPI REST API (auth, chat, upload, profile,
watchlist, goals) on the same app for the Next.js frontend to call.
"""
import logging
import uuid

from agno.os import AgentOS
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from backend import config
from backend.agents.coordinator_agent import build_coordinator_team
from backend.api.routers import auth, chat, goals, health, profile, transactions, upload, watchlist
from backend.logging_config import configure_logging, request_id_ctx
from backend.rate_limit import limiter

configure_logging()
logger = logging.getLogger("backend")

# Schema is managed by Alembic (backend/alembic/), not by
# Base.metadata.create_all() -- create_all() has no notion of revisions, so
# it can't evolve an existing DB and silently diverges from the migration
# history over time. Run `alembic upgrade head` before starting the app (see
# README "Database migrations"). This is intentionally not auto-run here:
# auto-running migrations on every app boot risks two workers racing an
# ALTER TABLE at once and masks a forgotten migration behind app code that
# "just happens" to still work -- better to fail loudly if the schema isn't
# up to date.
coordinator_team = build_coordinator_team()

agent_os = AgentOS(teams=[coordinator_team])
app = agent_os.get_app()

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Per-client-IP rate limiting (brute-force protection on auth, cost control
# on the LLM-backed /chat endpoint). Limits are set per-route via
# @limiter.limit(...) in the router modules themselves.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """Stamps every request with an id (from the client's X-Request-Id if it
    sent one, so a request can be traced end-to-end across a frontend/proxy
    that generates its own; otherwise a fresh one), stores it in a
    contextvar so backend.logging_config's formatter can attach it to every
    log line emitted while handling this request, and echoes it back on the
    response so a caller can correlate their request against server logs.
    """
    request_id = request.headers.get("x-request-id", uuid.uuid4().hex)
    token = request_id_ctx.set(request_id)
    try:
        response = await call_next(request)
    finally:
        request_id_ctx.reset(token)
    response.headers["X-Request-Id"] = request_id
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Logs unhandled exceptions with request context and returns a generic
    500 body -- never the raw exception/stack trace, which could leak
    internals (file paths, query text, provider error strings) to the
    client. The full traceback still goes to the server logs via
    logger.exception, tagged with the request id from the middleware above.
    """
    logger.exception(
        "unhandled_exception method=%s path=%s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={"X-Request-Id": request_id_ctx.get()},
    )


app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(upload.router)
app.include_router(profile.router)
app.include_router(watchlist.router)
app.include_router(goals.router)
app.include_router(transactions.router)
app.include_router(health.router)

if __name__ == "__main__":
    agent_os.serve(app="backend.main:app", reload=True)

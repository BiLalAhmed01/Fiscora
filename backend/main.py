"""Fiscora entrypoint: boots Agno's AgentOS (playground + agent/team run
endpoints) and mounts the FastAPI REST API (auth, chat, upload, profile,
watchlist, goals) on the same app for the Next.js frontend to call.
"""
from agno.os import AgentOS
from fastapi.middleware.cors import CORSMiddleware

from backend import config
from backend.agents.coordinator_agent import build_coordinator_team
from backend.api.routers import auth, chat, goals, profile, transactions, upload, watchlist

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

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(upload.router)
app.include_router(profile.router)
app.include_router(watchlist.router)
app.include_router(goals.router)
app.include_router(transactions.router)

if __name__ == "__main__":
    agent_os.serve(app="backend.main:app", reload=True)

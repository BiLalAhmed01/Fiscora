"""Shared Agno storage backend for agent/team chat history.

This is distinct from backend/db/models.py (the SQLAlchemy app database for
users, financial_profiles, transactions, goals, watchlists). Agno agents only
need this to persist their own conversation state, mirroring the SqliteDb
usage in the original AI Finance Agent Team script.
"""
from backend import config

_db = None


def get_agent_db():
    global _db
    if _db is not None:
        return _db

    if config.DATABASE_URL.startswith("postgresql"):
        from agno.db.postgres import PostgresDb

        _db = PostgresDb(db_url=config.DATABASE_URL)
    else:
        from agno.db.sqlite import SqliteDb

        _db = SqliteDb(db_file=config.AGENT_DB_FILE)

    return _db

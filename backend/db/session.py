"""SQLAlchemy engine/session for the app database (users, chat_history,
financial_profiles, transactions, goals, watchlists) -- distinct from
backend/db/agent_db.py, which only stores Agno's own conversation state.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend import config

connect_args = {"check_same_thread": False} if config.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(config.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

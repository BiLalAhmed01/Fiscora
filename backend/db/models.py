"""SQLAlchemy models for the Fiscora app database."""
import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utcnow():
    return datetime.datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    profile = relationship("FinancialProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    watchlist_items = relationship("WatchlistItem", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="chat_messages")


class FinancialProfile(Base):
    __tablename__ = "financial_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    monthly_income = Column(Float, default=0.0)
    dependants = Column(Integer, default=0)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="profile")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    source = Column(String, default="csv_upload")
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="transactions")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    goal_type = Column(String, nullable=False)  # "savings" | "debt"
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    interest_rate = Column(Float, nullable=True)  # relevant for debt goals
    min_payment = Column(Float, nullable=True)  # relevant for debt goals
    status = Column(String, default="active")  # active | completed
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="goals")


class WatchlistItem(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False)
    notes = Column(String, nullable=True)
    added_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="watchlist_items")

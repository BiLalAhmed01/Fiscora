"""Pydantic request/response models for the REST API (distinct from
backend/agents/finance_schemas.py, which are the agents' structured
output schemas)."""
import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# --- Auth ---
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # access token TTL in seconds


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


# --- Chat ---
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str


# --- CSV upload ---
class UploadCsvResponse(BaseModel):
    transactions_ingested: int
    category_totals: List[dict]


# --- Financial profile ---
class ProfileUpdate(BaseModel):
    monthly_income: Optional[float] = None
    dependants: Optional[int] = None


class ProfileResponse(BaseModel):
    monthly_income: float
    dependants: int
    updated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


# --- Watchlist ---
class WatchlistAdd(BaseModel):
    ticker: str
    notes: Optional[str] = None


class WatchlistItemResponse(BaseModel):
    id: int
    ticker: str
    notes: Optional[str] = None
    added_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Goals ---
class GoalCreate(BaseModel):
    name: str
    goal_type: str  # "savings" | "debt"
    target_amount: float
    current_amount: float = 0.0
    interest_rate: Optional[float] = None
    min_payment: Optional[float] = None


class GoalResponse(BaseModel):
    id: int
    name: str
    goal_type: str
    target_amount: float
    current_amount: float
    interest_rate: Optional[float] = None
    min_payment: Optional[float] = None
    status: str

    class Config:
        from_attributes = True

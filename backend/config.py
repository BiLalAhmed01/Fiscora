"""Central config: env vars, model selection, feature flags."""
import os
from dotenv import load_dotenv

load_dotenv()

# --- Provider API keys ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
XAI_API_KEY = os.getenv("XAI_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# --- Model routing ---
# Every agent defaults to DEFAULT_PROVIDER/DEFAULT_MODEL_ID unless overridden
# by a per-agent env var below. Supported providers: "openai", "xai", "gemini".
DEFAULT_PROVIDER = os.getenv("DEFAULT_PROVIDER", "openai")
DEFAULT_MODEL_ID = os.getenv("DEFAULT_MODEL_ID", "gpt-5.2-2025-12-11")

PROVIDER_KEYS = {
    "openai": OPENAI_API_KEY,
    "xai": XAI_API_KEY,
    "gemini": GOOGLE_API_KEY,
}


def is_provider_configured(provider: str) -> bool:
    """Whether the given provider's API key is actually set -- used to fail
    fast with a clean message instead of letting a raw provider error string
    (e.g. "OPENAI_API_KEY not set...") leak into the chat stream as if it
    were an agent response.
    """
    return bool(PROVIDER_KEYS.get(provider.lower()))


AGENT_MODEL_OVERRIDES = {
    "web_search": os.getenv("WEB_SEARCH_PROVIDER"),
    "market_data": os.getenv("MARKET_DATA_PROVIDER"),
    "investment_analysis": os.getenv("INVESTMENT_ANALYSIS_PROVIDER"),
    "budget_coach": os.getenv("BUDGET_COACH_PROVIDER"),
    "savings_strategy": os.getenv("SAVINGS_STRATEGY_PROVIDER"),
    "debt_reduction": os.getenv("DEBT_REDUCTION_PROVIDER"),
    "coordinator": os.getenv("COORDINATOR_PROVIDER"),
}

# --- Database ---
# Falls back to local SQLite when DATABASE_URL is unset (local dev without Docker/Postgres).
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./fiscora.db")
AGENT_DB_FILE = os.getenv("AGENT_DB_FILE", "fiscora_agents.db")

# --- Auth ---
# No fallback: an unset JWT_SECRET must stop the app from starting rather than
# silently signing tokens with a well-known dev value, in every environment.
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is not set. Set it in your .env file "
        "(see .env.example) before starting the app -- there is no default."
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# --- Feature flags ---
DEBUG_MODE = os.getenv("FISCORA_DEBUG", "true").lower() == "true"

# --- CORS (frontend origins allowed to call this API) ---
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
    ).split(",")
    if origin.strip()
]

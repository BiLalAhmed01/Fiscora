"""POST /chat -- routes a user message to the Fiscora coordinator Team and
streams the response back. Injects the user's stored financial data (profile,
transaction category totals, goals, watchlist) as context so the budget,
savings, debt, and investment agents reason over real data instead of only
what's typed in the message.
"""
import json
import re
import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend import config
from backend.agents.coordinator_agent import build_coordinator_team
from backend.api.deps import get_current_user
from backend.api.schemas import ChatRequest
from backend.db.models import ChatMessage, Goal, Transaction, User, WatchlistItem
from backend.db.session import SessionLocal, get_db
from backend.rate_limit import limiter, user_or_ip_key

NOT_CONFIGURED_MESSAGE = (
    "Fiscora isn't connected to an AI provider yet -- ask whoever runs this deployment to set "
    "an API key (e.g. `OPENAI_API_KEY`) in the backend's `.env` file."
)

# Agno's model layer (agno/models/base.py) injects raw tool-execution
# telemetry directly into the content stream -- e.g.
# "get_stock_fundamentals(symbol=SPY) completed in 4.3734s. " -- as plain
# text ahead of the real generated answer, not as a separate/filterable
# event type. Strip it here rather than showing internal tool bookkeeping
# to the end user.
_TOOL_STATUS_RE = re.compile(r"^\s*[\w_]+\([^)]*\)\s+completed in\s+[\d.]+s\.\s*")

# Some provider-SDK failures don't raise a catchable Python exception through
# Agno -- the raw error surfaces as if it were ordinary generated content
# instead. Observed live, two different shapes from two different providers:
#   - Gemini 429: "<bound method ClientResponse.text of <ClientResponse(...)
#     [429 Too Many Requests]>...>" (an unawaited response object's repr)
#   - xAI no-credits: "Your newly created team doesn't have any credits or
#     licenses yet. You can purchase those on https://console.x.ai/team/..."
# Both share the tell: they reference the provider's own internal
# infrastructure (an HTTP client object, or the provider's console/billing
# domain) rather than anything about the user's actual question. Detect that
# shape generically instead of matching each new error string one at a time.
_RAW_ERROR_MARKERS = (
    "<bound method",
    "ClientResponse(",
    "<ClientResponse",
    "console.x.ai",
    "platform.openai.com",
    "aistudio.google.com",
    "doesn't have any credits",
    "429 Too Many Requests",
)
RATE_LIMITED_MESSAGE = (
    "Fiscora's AI provider is rate-limiting requests right now (too many requests in a short "
    "window) -- please wait a moment and try again."
)


def _looks_like_raw_provider_error(content: str) -> bool:
    return any(marker in content for marker in _RAW_ERROR_MARKERS)

router = APIRouter(tags=["chat"])

# The coordinator Team is expensive to build (6 agents); reuse one instance.
_coordinator_team = None


def _get_coordinator_team():
    global _coordinator_team
    if _coordinator_team is None:
        _coordinator_team = build_coordinator_team()
    return _coordinator_team


def _build_financial_context(db: Session, user: User) -> str:
    profile = user.profile
    category_totals = (
        db.query(Transaction.category, func.sum(Transaction.amount))
        .filter(Transaction.user_id == user.id)
        .group_by(Transaction.category)
        .all()
    )
    goals = db.query(Goal).filter(Goal.user_id == user.id, Goal.status == "active").all()
    watchlist = db.query(WatchlistItem).filter(WatchlistItem.user_id == user.id).all()

    context = {
        "monthly_income": profile.monthly_income if profile else None,
        "dependants": profile.dependants if profile else None,
        "spending_by_category": {cat: float(total) for cat, total in category_totals},
        "goals": [
            {
                "name": g.name,
                "type": g.goal_type,
                "target_amount": g.target_amount,
                "current_amount": g.current_amount,
                "interest_rate": g.interest_rate,
                "min_payment": g.min_payment,
            }
            for g in goals
        ],
        "watchlist": [w.ticker for w in watchlist],
    }

    if not any([context["monthly_income"], context["spending_by_category"], context["goals"], context["watchlist"]]):
        return ""

    return (
        "\n\n[User's stored financial data -- use this as ground truth where relevant, "
        "the user does not need to repeat it]\n" + json.dumps(context)
    )


def _ndjson(agent: str | None, content: str) -> str:
    """One NDJSON line: {"agent": <specialist name or null for the
    coordinator's own synthesis>, "content": <text delta>}\\n -- lets the
    frontend label which specialist produced which part of the answer.
    """
    return json.dumps({"agent": agent, "content": content}) + "\n"


@router.post("/chat")
@limiter.limit("20/minute", key_func=user_or_ip_key)  # per-user cost control on this paid LLM endpoint;
# falls back to per-IP only for the (never-authenticated-in-practice, /chat
# requires a user) unauthenticated case -- see user_or_ip_key.
async def chat(
    request: Request,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session_id = payload.session_id or f"user-{user.id}-{uuid.uuid4().hex[:8]}"
    context = _build_financial_context(db, user)
    full_input = payload.message + context

    db.add(ChatMessage(user_id=user.id, session_id=session_id, role="user", content=payload.message))
    db.commit()

    team = _get_coordinator_team()
    coordinator_provider = (config.AGENT_MODEL_OVERRIDES.get("coordinator") or config.DEFAULT_PROVIDER).lower()

    async def event_stream():
        collected = []  # plain (agent, content) pairs -- used to build the persisted plain-text record

        if not config.is_provider_configured(coordinator_provider):
            # Fail fast and clean instead of letting Agno's raw "OPENAI_API_KEY
            # not set" provider string stream through as if it were an actual
            # agent response -- that's exactly the kind of raw technical error
            # that erodes trust in a product handling someone's finances.
            # Uses its own session (like the final save below) since the
            # request-scoped `db` may already be closed by the time this
            # generator actually runs.
            fail_db = SessionLocal()
            try:
                fail_db.add(
                    ChatMessage(user_id=user.id, session_id=session_id, role="assistant", content=NOT_CONFIGURED_MESSAGE)
                )
                fail_db.commit()
            finally:
                fail_db.close()
            yield _ndjson(None, NOT_CONFIGURED_MESSAGE)
            return

        try:
            # When a specialist's own generation becomes the team's visible
            # answer, its content arrives as agno.run.agent.RunContentEvent
            # (agent_name set from the member's own .name). When the
            # coordinator writes its own fresh synthesis instead, content
            # arrives as agno.run.team.RunContentEvent (no agent_name) --
            # that's the "None" / unattributed case. Verified live: which
            # path Agno takes is decided per-run by the team's own routing,
            # not something this endpoint controls -- a cross-domain answer
            # can legitimately come back under a single specialist's name if
            # Agno promotes that specialist's response to be the team's
            # answer, even though it drew on other members' context.
            async for event in team.arun(
                input=full_input,
                stream=True,
                session_id=session_id,
                user_id=str(user.id),
            ):
                content = getattr(event, "content", None)
                if isinstance(content, str) and content:
                    if _looks_like_raw_provider_error(content):
                        # The whole response is broken at this point (e.g. a
                        # 429 mid-stream) -- stop forwarding further garbage
                        # chunks and end the turn cleanly instead.
                        collected.append((None, RATE_LIMITED_MESSAGE))
                        yield _ndjson(None, RATE_LIMITED_MESSAGE)
                        break
                    content = _TOOL_STATUS_RE.sub("", content)
                    if not content:
                        continue
                    agent_name = getattr(event, "agent_name", None)
                    collected.append((agent_name, content))
                    yield _ndjson(agent_name, content)
        except Exception:
            # Surface a readable message in the stream itself rather than
            # silently truncating -- the frontend has no other way to learn
            # a mid-stream LLM/provider failure happened.
            fallback = (
                "\n\n_Sorry, I hit an error reaching the AI service just now. "
                "Please try asking again in a moment._"
            )
            collected.append((None, fallback))
            yield _ndjson(None, fallback)

        final_text = "".join(content for _, content in collected)
        persist_db = SessionLocal()
        try:
            persist_db.add(
                ChatMessage(user_id=user.id, session_id=session_id, role="assistant", content=final_text)
            )
            persist_db.commit()
        finally:
            persist_db.close()

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"X-Session-Id": session_id},
    )

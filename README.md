# Fiscora

Fiscora is a unified AI financial platform that merges four previously-separate
agent prototypes — stock/market research, web-search-augmented investment
analysis, and personal budget/savings/debt coaching — into one SaaS-style
product with a single chat UI, one shared Postgres/SQLite database, and one
coordinator agent that routes each request to the right specialist(s).

## What it does

Ask Fiscora things like:

- *"What's Nvidia's latest analyst rating and price target?"* → Market Data Agent
- *"Should I buy AAPL or MSFT right now?"* → Investment Analysis Agent
- *"Where can I cut spending based on my uploaded transactions?"* → Budget Coach Agent
- *"How big should my emergency fund be?"* → Savings Strategy Agent
- *"Should I pay off my credit card or invest the extra $500/month?"* → Coordinator
  consults Budget Coach, Savings Strategy, and Debt Reduction agents and merges
  their answers into one recommendation.

## Architecture

```
fiscora/
├── backend/
│   ├── agents/          # coordinator_agent.py (Agno Team) + 6 specialist agents
│   ├── tools/            # yfinance, duckduckgo, csv parser wrappers
│   ├── models/            # llm_router.py - provider abstraction (OpenAI / xAI / Gemini)
│   ├── db/                # SQLAlchemy models: users, chat_history, financial_profiles,
│   │                       #   transactions, goals, watchlists
│   ├── api/                # FastAPI routers: auth, chat, upload, profile, watchlist, goals
│   ├── config.py
│   └── main.py             # boots Agno AgentOS + mounts the FastAPI routers
├── frontend/                # Next.js 15 + Tailwind (chat, dashboard, auth, CSV upload)
├── requirements.txt          # merged & deduplicated from the 4 source projects
├── docker-compose.yml         # backend + frontend + postgres
└── .env.example
```

The **coordinator** (`backend/agents/coordinator_agent.py`) is a single Agno
`Team` whose members are the six specialist agents. It classifies each message
by intent, delegates to the relevant specialist(s), and — for cross-domain
questions ("invest or pay off debt?") — consults multiple specialists and
synthesizes one coherent answer rather than concatenating separate replies.

Each agent's model provider/model ID is resolved per-agent through
`backend/models/llm_router.py`, defaulting to `DEFAULT_PROVIDER` /
`DEFAULT_MODEL_ID` (OpenAI `gpt-5.2` by default) unless a per-agent override
env var is set.

## Migration notes (from the 4 source projects)

| Source project | Framework | Ported to |
|---|---|---|
| `AI Finance Agent Team` | Agno | `market_data_agent.py`, `web_search_agent.py` |
| `AI Investment Agent` | Agno | `investment_analysis_agent.py` |
| `AI Financial Coach Agent` | Google ADK + Streamlit | `budget_coach_agent.py`, `savings_strategy_agent.py`, `debt_reduction_agent.py` — logic ported to Agno agents; ADK's `SequentialAgent` coordinator became the Agno `Team` coordinator; Streamlit UI replaced by the Next.js frontend |
| `XAI Finance Agent` | Agno + xAI | Folded into `web_search_agent.py` / `market_data_agent.py`; xAI kept available as a selectable provider via `llm_router.py` |

The original four project folders are left untouched at the repo root for
reference — nothing was deleted.

## Running locally with Docker (recommended)

```bash
cp .env.example .env
# then fill in at least one provider key (OPENAI_API_KEY, XAI_API_KEY, or GOOGLE_API_KEY)

docker compose up --build
```

- Backend: http://localhost:8000 (docs at `/docs`)
- Frontend: http://localhost:3000
- Postgres: `localhost:5432` (user/pass/db: `fiscora`/`fiscora`/`fiscora`)

Docker Compose overrides `DATABASE_URL` to point at the `postgres` service —
you don't need to change it in `.env` for the Docker path. Run the migration
against that Postgres DB before (or right after) `docker compose up`:

```bash
docker compose run --rm backend alembic upgrade head
```

## Database migrations

Schema changes are managed with [Alembic](https://alembic.sqlalchemy.org/)
(`backend/alembic/`), not `Base.metadata.create_all()`. `create_all()` can
only create tables that don't exist yet — it has no concept of a revision
history, so it can't apply an `ALTER TABLE` to an existing DB and silently
drifts from what the models say once the schema changes. `backend/main.py`
no longer calls it.

**Before starting the app for the first time, or after pulling changes that
touch `backend/db/models.py`, run:**

```bash
alembic upgrade head
```

This targets whatever `DATABASE_URL` the app itself would use (SQLite
locally by default, Postgres under Docker/production) — `backend/alembic/env.py`
reads it straight from `backend.config.DATABASE_URL`.

To generate a new migration after changing a model:

```bash
alembic revision --autogenerate -m "describe the change"
```

Always read the generated migration before committing it — autogenerate is a
diff tool, not a guarantee; review column types, nullability, and index
changes especially.

**Design choice — migrations are not auto-run on app startup.** An earlier
option was to have `backend/main.py` call `alembic upgrade head` itself so
`uvicorn backend.main:app` "just works" with no extra step. That was
rejected: auto-running migrations on every boot means multiple workers/
replicas can race to apply the same `ALTER TABLE` concurrently, and it turns
a forgotten migration into a silent, unpredictable moment during a request
instead of a loud, obvious failure before the app ever starts serving
traffic. This mirrors the same fail-fast philosophy already used for
`JWT_SECRET` in `backend/config.py`: missing setup should stop the app at
boot with a clear message, not paper over the gap. The tradeoff is one extra
manual (or CI/CD-scripted) step per deploy — documented above, and worth
automating in your deploy pipeline (not the app itself) once you have one.

## Running locally without Docker

**Backend:**

```bash
cd fiscora
python -m venv .venv
.venv\Scripts\activate        # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

cp .env.example .env
# fill in at least one provider API key in .env
# DATABASE_URL already defaults to sqlite:///./fiscora.db, no Postgres needed

alembic upgrade head   # create/update the schema -- see "Database migrations" below

uvicorn backend.main:app --reload --port 8000
```

**Frontend** (separate terminal):

```bash
cd fiscora/frontend
npm install
npm run dev
```

Visit http://localhost:3000, sign up, then use the chat interface or upload a
CSV of transactions on the dashboard.

## Required environment variables

See `.env.example` for the full list. At minimum you need:

- One of `OPENAI_API_KEY` / `XAI_API_KEY` / `GOOGLE_API_KEY` matching your
  `DEFAULT_PROVIDER`
- `JWT_SECRET` — a random secret for signing auth tokens (a real one is
  already generated in `.env` if you copied it from this repo's setup)
- `DATABASE_URL` — SQLite by default locally, Postgres URL when using Docker

## API surface

- `POST /chat` — send a message to the coordinator agent (streamed)
- `POST /upload-csv` — upload and parse a transactions CSV
- `GET /profile`, `PUT /profile` — financial profile
- `GET /watchlist`, `POST /watchlist` — stock watchlist
- `POST /auth/signup`, `POST /auth/login` — JWT-based auth
- Full interactive docs at `/docs` once the backend is running

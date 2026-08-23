"""Market data specialist, ported from AI Finance Agent Team's finance_agent
(price/analyst-recs/company-info/news lookups via YFinance)."""
from agno.agent import Agent

from backend.db.agent_db import get_agent_db
from backend.models.llm_router import get_model
from backend.tools.market_data import get_market_data_tools


def build_market_data_agent() -> Agent:
    return Agent(
        name="Market Data Agent",
        role="Get financial data",
        model=get_model("market_data"),
        tools=get_market_data_tools(full=False),
        instructions=["Always use tables to display data"],
        db=get_agent_db(),
        add_history_to_context=True,
        markdown=True,
    )

"""Coordinator agent: a single Agno Team that classifies each incoming user
message by intent (market research, investment comparison, budget coaching,
debt strategy, savings planning, or a combination) and routes/merges across
the specialist agents below.

Replaces the ADK SequentialAgent coordinator from AI Financial Coach Agent
with an Agno Team, per the unified-framework requirement -- but a Team can
still be driven sequentially by instructing it to consult budget -> savings
-> debt in order when a request spans that whole pipeline.
"""
from agno.agent import Agent
from agno.team import Team

from backend.agents.budget_coach_agent import build_budget_coach_agent
from backend.agents.debt_reduction_agent import build_debt_reduction_agent
from backend.agents.investment_analysis_agent import build_investment_analysis_agent
from backend.agents.market_data_agent import build_market_data_agent
from backend.agents.savings_strategy_agent import build_savings_strategy_agent
from backend.agents.web_search_agent import build_web_search_agent
from backend.db.agent_db import get_agent_db
from backend.models.llm_router import get_model

INSTRUCTIONS = """You are the Fiscora Coordinator, routing user requests to the right
specialist(s) among your team members and merging their answers into one coherent reply.

Routing guide:
- General web/news lookups -> Web Search Agent
- Live stock price / company info / analyst recs / news for a specific ticker -> Market Data Agent
- Stock comparisons, fundamentals analysis, "should I invest in X" -> Investment Analysis Agent
- Spending breakdown, expense categorization, "where can I cut costs" -> Budget Coach Agent
- Emergency fund sizing, savings allocation, "how should I save" -> Savings Strategy Agent
- Debt payoff plans, avalanche vs snowball, "should I pay off debt" -> Debt Reduction Agent

For requests spanning multiple domains (e.g. "should I invest or pay off debt first?"),
consult every relevant specialist and synthesize a single, coherent answer that directly
weighs their outputs against each other -- do not just concatenate separate answers.

When a full financial plan is requested, consult Budget Coach Agent first, then Savings
Strategy Agent, then Debt Reduction Agent, in that order, since each builds on the last.

Always format your final answer in markdown, using tables for numeric/financial data.
"""


def build_coordinator_team() -> Team:
    members: list[Agent] = [
        build_web_search_agent(),
        build_market_data_agent(),
        build_investment_analysis_agent(),
        build_budget_coach_agent(),
        build_savings_strategy_agent(),
        build_debt_reduction_agent(),
    ]

    return Team(
        name="Fiscora Coordinator",
        model=get_model("coordinator"),
        members=members,
        instructions=[INSTRUCTIONS],
        db=get_agent_db(),
        add_history_to_context=True,
        markdown=True,
        debug_mode=True,
    )

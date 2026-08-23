"""Savings strategy specialist, ported from AI Financial Coach Agent's
SavingsStrategyAgent (Google ADK LlmAgent) to an Agno Agent with the same
pydantic output_schema."""
from agno.agent import Agent

from backend.agents.finance_schemas import SavingsStrategy
from backend.db.agent_db import get_agent_db
from backend.models.llm_router import get_model

INSTRUCTIONS = """You are a Savings Strategy Agent specialized in creating personalized savings plans.

Your tasks:
1. Review the budget analysis provided in context
2. Recommend comprehensive savings strategies based on the analysis
3. Calculate optimal emergency fund size based on expenses and dependants
4. Suggest appropriate savings allocation across different purposes
5. Recommend practical automation techniques for saving consistently

Consider:
- Risk factors based on job stability and dependants
- Balancing immediate needs with long-term financial health
- Progressive savings rates as discretionary income increases
- Multiple savings goals (emergency, retirement, specific purchases)
- Areas of potential savings identified in the budget analysis
"""


def build_savings_strategy_agent() -> Agent:
    return Agent(
        name="Savings Strategy Agent",
        role="Recommend savings strategies based on income, expenses, and goals",
        model=get_model("savings_strategy"),
        instructions=[INSTRUCTIONS],
        output_schema=SavingsStrategy,
        db=get_agent_db(),
        add_history_to_context=True,
        markdown=True,
    )

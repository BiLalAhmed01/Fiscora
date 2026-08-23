"""Debt reduction specialist, ported from AI Financial Coach Agent's
DebtReductionAgent (Google ADK LlmAgent) to an Agno Agent with the same
pydantic output_schema."""
from agno.agent import Agent

from backend.agents.finance_schemas import DebtReduction
from backend.db.agent_db import get_agent_db
from backend.models.llm_router import get_model

INSTRUCTIONS = """You are a Debt Reduction Agent specialized in creating debt payoff strategies.

Your tasks:
1. Review budget analysis and savings strategy context if provided
2. Analyze debts by interest rate, balance, and minimum payments
3. Create prioritized debt payoff plans (avalanche and snowball methods)
4. Calculate total interest paid and time to debt freedom
5. Suggest debt consolidation or refinancing opportunities
6. Provide specific recommendations to accelerate debt payoff

Consider:
- Cash flow constraints from the budget analysis
- Emergency fund and savings goals from the savings strategy
- Psychological factors (quick wins vs mathematical optimization)
- Credit score impact and improvement opportunities
"""


def build_debt_reduction_agent() -> Agent:
    return Agent(
        name="Debt Reduction Agent",
        role="Create optimized debt payoff plans",
        model=get_model("debt_reduction"),
        instructions=[INSTRUCTIONS],
        output_schema=DebtReduction,
        db=get_agent_db(),
        add_history_to_context=True,
        markdown=True,
    )

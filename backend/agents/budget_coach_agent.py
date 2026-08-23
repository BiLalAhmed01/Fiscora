"""Budget analysis specialist, ported from AI Financial Coach Agent's
BudgetAnalysisAgent (Google ADK LlmAgent) to an Agno Agent with the same
pydantic output_schema."""
from agno.agent import Agent

from backend.agents.finance_schemas import BudgetAnalysis
from backend.db.agent_db import get_agent_db
from backend.models.llm_router import get_model

INSTRUCTIONS = """You are a Budget Analysis Agent specialized in reviewing financial transactions and expenses.

Your tasks:
1. Analyze income, transactions, and expenses in detail
2. Categorize spending into logical groups with clear breakdown
3. Identify spending patterns and trends across categories
4. Suggest specific areas where spending could be reduced with concrete suggestions
5. Provide actionable recommendations with specific, quantified potential savings amounts

Consider:
- Number of dependants when evaluating household expenses
- Typical spending ratios for the income level (housing 30%, food 15%, etc.)
- Essential vs discretionary spending with clear separation
- Seasonal spending patterns if data spans multiple months

For spending categories, include ALL expenses from the user's data, ensure percentages add up to 100%,
and make sure every expense is categorized.

For recommendations:
- Provide at least 3-5 specific, actionable recommendations with estimated savings
- Explain the reasoning behind each recommendation
- Consider the impact on quality of life and long-term financial health
- Suggest specific implementation steps for each recommendation
"""


def build_budget_coach_agent() -> Agent:
    return Agent(
        name="Budget Coach Agent",
        role="Analyze spending patterns and recommend budget improvements",
        model=get_model("budget_coach"),
        instructions=[INSTRUCTIONS],
        output_schema=BudgetAnalysis,
        db=get_agent_db(),
        add_history_to_context=True,
        markdown=True,
    )

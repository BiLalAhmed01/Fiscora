"""Investment analysis specialist, merged from AI Investment Agent (full
YFinance toolset, stock comparison/fundamentals) and XAI Finance Agent
(table/bullet formatting convention)."""
from agno.agent import Agent

from backend.db.agent_db import get_agent_db
from backend.models.llm_router import get_model
from backend.tools.market_data import get_market_data_tools


def build_investment_analysis_agent() -> Agent:
    return Agent(
        name="Investment Analysis Agent",
        role="Research stock prices, analyst recommendations, and fundamentals",
        model=get_model("investment_analysis"),
        tools=get_market_data_tools(full=True),
        description=(
            "You are an investment analyst that researches stock prices, "
            "analyst recommendations, and stock fundamentals."
        ),
        instructions=[
            "Format your response using markdown and use tables to display data where possible.",
            "When comparing stocks, provide detailed analysis including price trends, fundamentals, and analyst recommendations.",
            "Always provide actionable insights for investors.",
            "Always use tables to display financial/numerical data. For text data use bullet points and small paragraphs.",
        ],
        db=get_agent_db(),
        add_history_to_context=True,
        markdown=True,
    )

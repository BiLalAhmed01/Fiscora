"""Web search specialist, ported from AI Finance Agent Team's web_agent."""
from agno.agent import Agent

from backend.db.agent_db import get_agent_db
from backend.models.llm_router import get_model
from backend.tools.web_search import get_web_search_tools


def build_web_search_agent() -> Agent:
    return Agent(
        name="Web Search Agent",
        role="Search the web for information",
        model=get_model("web_search"),
        tools=get_web_search_tools(),
        db=get_agent_db(),
        add_history_to_context=True,
        markdown=True,
    )

"""DuckDuckGo web search tool wrapper, ported from AI Finance Agent Team's web_agent."""
from agno.tools.duckduckgo import DuckDuckGoTools


def get_web_search_tools():
    return [DuckDuckGoTools()]

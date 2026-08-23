"""YFinance tool wrapper, ported from AI Finance Agent Team / AI Investment Agent /
XAI Finance Agent (all three used YFinanceTools, with the finance_agent variant
restricting to a specific tool subset)."""
from agno.tools.yfinance import YFinanceTools


def get_market_data_tools(full: bool = True):
    """full=True mirrors AI Investment Agent / XAI Finance Agent (all tools).
    full=False mirrors the Finance Agent Team's restricted subset
    (price, analyst recs, company info, company news)."""
    if full:
        return [YFinanceTools(all=True)]
    return [
        YFinanceTools(
            enable_stock_price=True,
            enable_analyst_recommendations=True,
            enable_company_info=True,
            enable_company_news=True,
        )
    ]

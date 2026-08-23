"""CSV transaction parsing/validation, ported from AI Financial Coach Agent
(ai_financial_coach_agent.py: parse_csv_transactions / validate_csv_format),
stripped of Streamlit dependencies so it can be called from the FastAPI upload
endpoint and from the budget_coach_agent tool.
"""
import csv
from io import StringIO
from typing import Any, Dict, List, Tuple

import pandas as pd

REQUIRED_COLUMNS = ["Date", "Category", "Amount"]


def validate_csv_format(file_content: bytes) -> Tuple[bool, str]:
    """Validate CSV bytes have headers, required columns, and parseable date/amount."""
    try:
        text = file_content.decode("utf-8")
        has_header = csv.Sniffer().has_header(text)
        if not has_header:
            return False, "CSV file must have headers"

        df = pd.read_csv(StringIO(text))
        missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing_columns:
            return False, f"Missing required columns: {', '.join(missing_columns)}"

        try:
            pd.to_datetime(df["Date"])
        except Exception:
            return False, "Invalid date format in Date column"

        try:
            df["Amount"].replace(r"[\$,]", "", regex=True).astype(float)
        except Exception:
            return False, "Invalid amount format in Amount column"

        return True, "CSV format is valid"
    except Exception as e:
        return False, f"Invalid CSV format: {str(e)}"


def parse_csv_transactions(file_content: bytes) -> Dict[str, Any]:
    """Parse CSV bytes into transactions + per-category totals."""
    try:
        df = pd.read_csv(StringIO(file_content.decode("utf-8")))

        missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

        df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")
        df["Amount"] = df["Amount"].replace(r"[\$,]", "", regex=True).astype(float)

        category_totals = df.groupby("Category")["Amount"].sum().reset_index()
        transactions: List[Dict[str, Any]] = df.to_dict("records")

        return {
            "transactions": transactions,
            "category_totals": category_totals.to_dict("records"),
        }
    except Exception as e:
        raise ValueError(f"Error parsing CSV file: {str(e)}")

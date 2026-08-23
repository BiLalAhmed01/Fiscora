"""Chat endpoint tests. The real Agno Team needs live LLM provider keys and
costs money per call, so these mock the team at the
backend.api.routers.chat._get_coordinator_team() seam instead -- the seam the
endpoint itself already uses to lazily build/reuse the team. This exercises
the real streaming/NDJSON/error-handling logic in chat.py without touching
any provider.
"""
import json

import pytest

from backend import config
from backend.api.routers import chat as chat_module

SPECIALIST_AGENT_NAMES = [
    "Web Search Agent",
    "Market Data Agent",
    "Investment Analysis Agent",
    "Budget Coach Agent",
    "Savings Strategy Agent",
    "Debt Reduction Agent",
]


class _FakeEvent:
    def __init__(self, content, agent_name=None):
        self.content = content
        self.agent_name = agent_name


def _make_fake_team(events):
    class FakeTeam:
        async def arun(self, input, stream, session_id, user_id):
            for event in events:
                yield event

    return FakeTeam()


def _ndjson_lines(text: str):
    return [json.loads(line) for line in text.strip().split("\n") if line.strip()]


@pytest.fixture(autouse=True)
def _provider_configured(monkeypatch):
    monkeypatch.setattr(config, "is_provider_configured", lambda provider: True)


@pytest.mark.parametrize("agent_name", SPECIALIST_AGENT_NAMES)
def test_chat_streams_response_per_specialist_agent(client, signed_up_user, monkeypatch, agent_name):
    _tokens, headers = signed_up_user
    fake_team = _make_fake_team([_FakeEvent(content=f"Answer from {agent_name}", agent_name=agent_name)])
    monkeypatch.setattr(chat_module, "_get_coordinator_team", lambda: fake_team)

    resp = client.post("/chat", headers=headers, json={"message": "What should I do?"})
    assert resp.status_code == 200

    lines = _ndjson_lines(resp.text)
    assert len(lines) == 1
    assert lines[0]["agent"] == agent_name
    assert lines[0]["content"] == f"Answer from {agent_name}"


def test_chat_streams_coordinator_synthesis_with_no_agent_name(client, signed_up_user, monkeypatch):
    _tokens, headers = signed_up_user
    fake_team = _make_fake_team([_FakeEvent(content="Coordinator's own synthesis", agent_name=None)])
    monkeypatch.setattr(chat_module, "_get_coordinator_team", lambda: fake_team)

    resp = client.post("/chat", headers=headers, json={"message": "Give me a full plan"})
    lines = _ndjson_lines(resp.text)
    assert lines[0]["agent"] is None
    assert lines[0]["content"] == "Coordinator's own synthesis"


def test_chat_strips_tool_status_telemetry(client, signed_up_user, monkeypatch):
    _tokens, headers = signed_up_user
    raw = "get_stock_fundamentals(symbol=SPY) completed in 4.3734s. Here's the real answer."
    fake_team = _make_fake_team([_FakeEvent(content=raw, agent_name="Market Data Agent")])
    monkeypatch.setattr(chat_module, "_get_coordinator_team", lambda: fake_team)

    resp = client.post("/chat", headers=headers, json={"message": "SPY fundamentals?"})
    lines = _ndjson_lines(resp.text)
    assert lines[0]["content"] == "Here's the real answer."


def test_chat_provider_not_configured_returns_clean_message(client, signed_up_user, monkeypatch):
    _tokens, headers = signed_up_user
    monkeypatch.setattr(config, "is_provider_configured", lambda provider: False)

    resp = client.post("/chat", headers=headers, json={"message": "Hello"})
    lines = _ndjson_lines(resp.text)
    assert lines[0]["agent"] is None
    assert "isn't connected to an AI provider" in lines[0]["content"]


def test_chat_requires_auth(client):
    resp = client.post("/chat", json={"message": "Hello"})
    assert resp.status_code == 401

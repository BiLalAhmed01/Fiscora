"""Thin LLM abstraction so each agent can be pointed at a different provider
via env vars while everything defaults to one provider (see config.py).
"""
from agno.models.openai import OpenAIChat
from agno.models.xai import xAI
from agno.models.google import Gemini

from backend import config

_DEFAULT_MODEL_IDS = {
    "openai": "gpt-5.2-2025-12-11",
    "xai": "grok-4-1-fast",
    "gemini": "gemini-3.6-flash",
}

_PROVIDER_CLASSES = {
    "openai": OpenAIChat,
    "xai": xAI,
    "gemini": Gemini,
}


def get_model(agent_key: str):
    """Return a configured model instance for the given agent key.

    Resolution order: per-agent provider override (env var) -> DEFAULT_PROVIDER.
    Model id follows the same provider's sensible default unless DEFAULT_MODEL_ID
    is set and the provider matches DEFAULT_PROVIDER.
    """
    provider = config.AGENT_MODEL_OVERRIDES.get(agent_key) or config.DEFAULT_PROVIDER
    provider = provider.lower()

    if provider not in _PROVIDER_CLASSES:
        raise ValueError(f"Unknown model provider '{provider}' for agent '{agent_key}'")

    if provider == config.DEFAULT_PROVIDER and config.DEFAULT_MODEL_ID:
        model_id = config.DEFAULT_MODEL_ID
    else:
        model_id = _DEFAULT_MODEL_IDS[provider]

    model_cls = _PROVIDER_CLASSES[provider]
    return model_cls(id=model_id)

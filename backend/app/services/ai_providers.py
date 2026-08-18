import json
import urllib.request
import urllib.error
from abc import ABC, abstractmethod
from typing import Optional
from app.core.config import settings


class AIProvider(ABC):
    """Common interface every LLM backend must implement."""

    name: str = "base"

    @abstractmethod
    def complete(self, system_prompt: str, user_prompt: str) -> str:
        ...

    def _post_json(self, url: str, headers: dict, payload: dict, timeout: int = 15) -> dict:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))


class OpenAIProvider(AIProvider):
    name = "openai"

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        data = self._post_json(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            payload={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        return data["choices"][0]["message"]["content"]


class OpenRouterProvider(AIProvider):
    name = "openrouter"

    def __init__(self, api_key: str, model: str = "google/gemini-2.0-flash-001"):
        self.api_key = api_key
        self.model = model

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        data = self._post_json(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            payload={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        return data["choices"][0]["message"]["content"]


class AnthropicProvider(AIProvider):
    name = "anthropic"

    def __init__(self, api_key: str, model: str = "claude-sonnet-5"):
        self.api_key = api_key
        self.model = model

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        data = self._post_json(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            payload={
                "model": self.model,
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            },
        )
        return data["content"][0]["text"]


def get_configured_provider() -> Optional[AIProvider]:
    """Picks a real provider from whichever API key is actually set, in priority order.
    Returns None (synthetic fallback) if no key is configured."""
    if settings.ANTHROPIC_API_KEY:
        return AnthropicProvider(settings.ANTHROPIC_API_KEY)
    if settings.OPENAI_API_KEY:
        return OpenAIProvider(settings.OPENAI_API_KEY)
    if settings.OPENROUTER_API_KEY:
        return OpenRouterProvider(settings.OPENROUTER_API_KEY)
    return None

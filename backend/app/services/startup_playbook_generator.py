"""Compiles a startup 'playbook' entry — founding story, initial cost, business plan, ROI — for a
named company or business idea, using the configured AI provider when available. Falls back to a
blank editable template when no provider is configured, matching the app's graceful-degradation
convention rather than fabricating specifics with no research behind them."""

import json
import re
from app.services.ai_providers import get_configured_provider

_SYSTEM_PROMPT = (
    "You are a startup research analyst compiling a reference playbook entry. Given a company or "
    "business idea name, respond with ONLY a JSON object, no markdown fences, matching exactly "
    "this schema: "
    '{"industry": str, "founding_story": str (2-4 paragraphs on how it started), '
    '"initial_cost_estimate": number (USD, your best estimate of what it took to start), '
    '"initial_cost_notes": str (what that estimate covers/assumes), '
    '"business_plan_summary": str (the core business model), '
    '"key_details": str (founders, founding year, notable milestones), '
    '"roi_notes": str (known or estimated return/valuation outcome), '
    '"tags": [str] (3-6 short tags)}. '
    "If this is a well-known real company, use what you actually know. If it's a hypothetical/"
    "generic idea, give a well-reasoned illustrative estimate and say so in the notes."
)


def _extract_json(raw: str) -> dict | None:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _blank_template(name: str) -> dict:
    return {
        "industry": None,
        "founding_story": f"No AI provider is configured, so this entry is a blank template — fill in {name}'s founding story yourself, or configure ANTHROPIC_API_KEY/OPENAI_API_KEY/OPENROUTER_API_KEY and regenerate.",
        "initial_cost_estimate": None,
        "initial_cost_notes": None,
        "business_plan_summary": None,
        "key_details": None,
        "roi_notes": None,
        "tags": [],
        "_source": "manual",
    }


def generate_playbook(name: str) -> dict:
    provider = get_configured_provider()
    if provider:
        try:
            raw = provider.complete(_SYSTEM_PROMPT, f"Company or idea: {name}")
            parsed = _extract_json(raw)
            if parsed:
                parsed["_source"] = "ai_generated"
                return parsed
        except Exception:
            pass
    return _blank_template(name)

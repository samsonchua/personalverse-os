"""Generates a structured, interactive mini-course (modules -> lessons -> quiz questions) for any
industry or topic the user asks for. Uses the configured AI provider when available; otherwise
falls back to a generic-but-usable synthetic template so the feature works with no API key,
matching the graceful-degradation pattern used by Web Reader and Stock Analysis."""

import json
import re
from app.services.ai_providers import get_configured_provider

_SYSTEM_PROMPT = (
    "You are an expert curriculum designer. Given an industry or topic, design a beginner-to-"
    "intermediate course. Respond with ONLY a JSON object, no markdown fences, matching exactly "
    "this schema: "
    '{"title": str, "description": str, "difficulty": "Beginner"|"Intermediate"|"Advanced", '
    '"estimated_hours": int, "modules": [{"title": str, "lessons": [{"title": str, '
    '"content": str (300-500 words, markdown, teaches real concepts), '
    '"quiz": [{"question": str, "options": [str, str, str, str], "correct_index": int (0-3), '
    '"explanation": str}] (2 questions per lesson)}] (2-3 lessons per module)}] '
    "(3-4 modules total)."
)


def _extract_json(raw: str) -> dict | None:
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _synthetic_course(industry: str) -> dict:
    module_titles = [
        f"Introduction to the {industry} Industry",
        f"How {industry} Businesses Make Money",
        f"Key Players and Competitive Landscape in {industry}",
        f"Trends, Risks, and Opportunities in {industry}",
    ]
    modules = []
    for m_title in module_titles:
        lessons = []
        for i in range(1, 3):
            lessons.append({
                "title": f"{m_title} — Part {i}",
                "content": (
                    f"This is a placeholder lesson on **{m_title.lower()}**. No AI provider is "
                    f"configured, so this outline is generic rather than industry-specific — set "
                    f"`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `OPENROUTER_API_KEY` and regenerate "
                    f"this course for real, researched content on {industry}.\n\n"
                    f"Use this space to note down what you already know about {industry}: who the "
                    f"major companies are, how they generate revenue, what a newcomer needs to "
                    f"understand before working in or investing in this space."
                ),
                "quiz": [
                    {
                        "question": f"What is one defining characteristic of the {industry} industry?",
                        "options": ["Not sure yet", "High capital intensity", "Purely digital", "No regulation"],
                        "correct_index": 0,
                        "explanation": "Placeholder question — regenerate with an AI provider configured for a real quiz.",
                    },
                ],
            })
        modules.append({"title": m_title, "lessons": lessons})

    return {
        "title": f"Introduction to {industry}",
        "description": f"A starter outline for learning the {industry} industry (synthetic — no AI provider configured).",
        "difficulty": "Beginner",
        "estimated_hours": 4,
        "modules": modules,
    }


def generate_course(industry: str) -> dict:
    provider = get_configured_provider()
    if provider:
        try:
            raw = provider.complete(_SYSTEM_PROMPT, f"Industry or topic: {industry}")
            parsed = _extract_json(raw)
            if parsed and parsed.get("modules"):
                parsed["_source"] = "ai_generated"
                return parsed
        except Exception:
            pass  # fall through to synthetic
    course = _synthetic_course(industry)
    course["_source"] = "synthetic"
    return course

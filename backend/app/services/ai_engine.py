from typing import Dict, Any
from app.services.ai_providers import get_configured_provider

AGENT_PERSONAS = {
    "ceo_agent": {
        "name": "CEO Agent",
        "role": "Executive Life Strategist",
        "avatar": "👑",
        "system_prompt": "You are the CEO Agent of Samson's Personal OS. You provide high-level strategic alignment across finance, health, career, and productivity."
    },
    "finance_agent": {
        "name": "Finance Coach",
        "role": "Chief Financial Officer AI",
        "avatar": "💎",
        "system_prompt": "You are the Finance Coach. You analyze spending habits, net worth progression, investments, cash flow, and savings goals."
    },
    "dev_agent": {
        "name": "Developer Agent",
        "role": "Lead Systems & Software Architect",
        "avatar": "⚡",
        "system_prompt": "You are the Coding & Systems Architecture Agent. You analyze software engineering goals, codebase architecture, and tech stacks."
    },
    "health_coach": {
        "name": "Health Coach",
        "role": "Peak Performance & Biohacking Coach",
        "avatar": "🏋️",
        "system_prompt": "You are the Health & Biohacking Agent. You analyze nutrition, workouts, sleep quality, HRV, and weight progress."
    },
    "meeting_assistant": {
        "name": "Meeting Assistant",
        "role": "Executive Meeting Summarizer & Action Item Extractor",
        "avatar": "📝",
        "system_prompt": "You are the Executive Meeting Assistant. You transform raw transcriptions into structured action items and decision points."
    },
    "research_agent": {
        "name": "Research Agent",
        "role": "NotebookLM & Synthesis Specialist",
        "avatar": "🧠",
        "system_prompt": "You are the Research & Knowledge Agent. You synthesize books, research papers, courses, and NotebookLM insights."
    }
}

# Synthetic fallback used whenever no AI provider API key is configured, or the
# configured provider call fails (rate limit, network, invalid key, etc).
SYNTHETIC_RESPONSES = {
    "ceo_agent": "🎯 **CEO Executive Strategy Update**:\n\nRegarding *'{prompt}'*, your life operating systems show strong velocity. Key recommendations:\n1. **Focus Metric**: Maintain 80%+ task completion on top priority WorkBuddy projects.\n2. **Resource Allocation**: Re-invest surplus monthly cashflow into high-yielding index funds.\n3. **Energy Management**: Align your 90-minute deep work blocks with your peak circadian rhythm.",
    "finance_agent": "📊 **CFO Financial Analysis**:\n\nAnalyzing query: *'{prompt}'*.\n• Net Worth trend is current up +4.2% month-over-month.\n• Spending anomaly detected in dining out (-$120 over budget), offset by low tech expenses.\n• Recommendation: Automate $500 transfer to your High-Yield Investment Account.",
    "dev_agent": "💻 **Systems Architecture Briefing**:\n\nReviewing *'{prompt}'*:\n• Clean Architecture pattern verified for scalability.\n• Recommend using asynchronous background task queues for heavy vector embeddings.\n• Database indexing on `(source_id, target_id)` optimized for Life Graph queries.",
    "health_coach": "🥗 **Biohacking & Health Briefing**:\n\nResponse to *'{prompt}'*:\n• Average sleep time is 7.8 hours (85% optimal recovery score).\n• Protein intake is currently averaging 150g/day against target 160g.\n• Action: Hydrate with 500ml water immediately post-workout today.",
    "meeting_assistant": "📌 **Meeting Notes & Action Items Summary**:\n\nFor session query: *'{prompt}'*:\n1. [ACTION] Finalize Vite frontend component architecture by EOD.\n2. [DECISION] Adopt SQLite for local prototyping with seamless PostgreSQL container migration.\n3. [FOLLOW-UP] Review NotebookLM imported articles tomorrow at 09:00.",
    "research_agent": "📚 **Knowledge Base Synthesis**:\n\nSynthesizing insights for *'{prompt}'*:\n• Key concept cross-referenced across 3 saved articles & 2 books.\n• High semantic relevance discovered between your Second Brain notes and WorkBuddy Project Roadmap.",
}


class AIEngine:
    def chat(self, agent_id: str, prompt: str, context_domain: str = None) -> Dict[str, Any]:
        agent_info = AGENT_PERSONAS.get(agent_id, AGENT_PERSONAS["ceo_agent"])
        provider = get_configured_provider()

        if provider:
            try:
                content = provider.complete(agent_info["system_prompt"], prompt)
                return {
                    "agent_id": agent_id,
                    "agent_name": agent_info["name"],
                    "avatar": agent_info["avatar"],
                    "response": content,
                    "status": "success",
                    "provider": provider.name,
                }
            except Exception:
                pass  # fall through to synthetic response below

        fallback_template = SYNTHETIC_RESPONSES.get(agent_id, SYNTHETIC_RESPONSES["ceo_agent"])
        return {
            "agent_id": agent_id,
            "agent_name": agent_info["name"],
            "avatar": agent_info["avatar"],
            "response": fallback_template.format(prompt=prompt),
            "status": "success",
            "provider": "synthetic",
        }


ai_engine = AIEngine()

from fastapi import APIRouter, Depends
from app.core.deps import get_current_user
from app.schemas.schemas import AIChatRequest
from app.services.ai_engine import ai_engine, AGENT_PERSONAS
from app.services.ai_providers import get_configured_provider

router = APIRouter(prefix="/ai", tags=["AI Engine & Agents"], dependencies=[Depends(get_current_user)])

@router.get("/agents")
def list_ai_agents():
    return list(AGENT_PERSONAS.values())

@router.post("/chat")
def chat_with_ai_agent(req: AIChatRequest):
    return ai_engine.chat(
        agent_id=req.agent_id,
        prompt=req.prompt,
        context_domain=req.context_domain
    )

@router.get("/provider-status")
def get_provider_status():
    """Reports which LLM provider is actually configured server-side, so the
    frontend can show real state instead of a fake API-key input."""
    provider = get_configured_provider()
    return {
        "provider": provider.name if provider else "synthetic",
        "configured": provider is not None,
    }

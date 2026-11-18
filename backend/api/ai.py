"""API router for AI-Assisted Purpose Minimization & LLM Evaluation."""
import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from backend.services.ai_copilot import (
    AIPurposeEvaluation,
    build_evaluation_prompt,
    evaluate_with_ai_fallback,
    PURPOSE_MINIMIZATION_SYSTEM_PROMPT,
)

logger = logging.getLogger("privacyguard.api.ai")
router = APIRouter(prefix="/api/ai", tags=["AI Copilot & Structured Evaluation"])


class AIEvaluationRequest(BaseModel):
    purpose: str = Field(default="expense_reimbursement", description="Sharing purpose")
    detected: List[Dict[str, Any]] = Field(default_factory=list, description="List of detected PII entities")


@router.post(
    "/evaluate-purpose",
    response_model=AIPurposeEvaluation,
    status_code=status.HTTP_200_OK,
    summary="Evaluate purpose minimization via structured AI Copilot",
)
async def evaluate_purpose_ai(payload: AIEvaluationRequest) -> AIPurposeEvaluation:
    """Evaluates detected entities using structured prompt engineering and defensive encapsulation.
    Returns typed AIPurposeEvaluation schema with zero raw data leakage.
    """
    try:
        logger.info(
            "AI Copilot evaluating purpose '%s' on %d entities",
            payload.purpose,
            len(payload.detected),
        )
        return evaluate_with_ai_fallback(payload.purpose, payload.detected)
    except Exception as exc:
        logger.error("AI evaluation failure: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to evaluate purpose via AI Copilot.",
        )


@router.get(
    "/prompt-template",
    summary="Inspect prompt engineering system template and injection defenses",
)
async def get_prompt_template():
    """Returns the system prompt and defense configuration for audit inspection."""
    return {
        "system_prompt": PURPOSE_MINIMIZATION_SYSTEM_PROMPT,
        "defense_mechanisms": [
            "Encapsulation inside <untrusted_entities> delimiters",
            "Jailbreak regex pattern sanitization",
            "Pydantic strict schema validation (extra='forbid')",
            "Deterministic fallback pipeline",
        ],
    }

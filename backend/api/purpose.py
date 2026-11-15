"""API router for purpose-aware data minimization analysis."""
import logging
from fastapi import APIRouter, HTTPException, status
from backend.schemas.purpose import PurposeAnalyzeRequest, PurposeAnalyzeResponse
from backend.services.purpose_engine import analyze_purpose

logger = logging.getLogger("privacyguard.purpose")
router = APIRouter(prefix="/api/analyze", tags=["Purpose Analysis"])


@router.post(
    "/purpose",
    response_model=PurposeAnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze detected PII against purpose minimization policy",
)
async def analyze_purpose_endpoint(payload: PurposeAnalyzeRequest) -> PurposeAnalyzeResponse:
    """Analyze detected PII entities in the context of a chosen sharing purpose.
    Returns tailored KEEP and PROTECT recommendations with deterministic explainability.
    """
    try:
        logger.info(
            "Processing purpose analysis for purpose '%s' with %d detected items",
            payload.purpose,
            len(payload.detected),
        )

        response = analyze_purpose(
            purpose=payload.purpose,
            detected=payload.detected,
        )

        logger.info(
            "Purpose analysis complete: %d KEEP, %d PROTECT",
            response.total_keep,
            response.total_protect,
        )

        return response

    except Exception as exc:
        logger.error("Error analyzing purpose: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to evaluate purpose minimization policy.",
        )

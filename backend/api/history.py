"""API endpoints for scan history and privacy metrics."""
import logging
from fastapi import APIRouter, Query, HTTPException, status
from backend.schemas.history import HistoryResponse, StatsResponse, PrivacyStats
from backend.database.models import get_history, get_privacy_stats

logger = logging.getLogger("privacyguard.api.history")

router = APIRouter(prefix="/api", tags=["History & Privacy Metrics"])


@router.get(
    "/history",
    response_model=HistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve recent scan and protection history",
)
async def get_scan_history(
    limit: int = Query(default=20, ge=1, le=100, description="Maximum number of records to return (1-100)"),
) -> HistoryResponse:
    """Retrieve recent safe operational metadata.
    NEVER returns raw text, OCR content, or PII values.
    """
    try:
        records = get_history(limit=limit)
        return HistoryResponse(success=True, history=records)
    except Exception as exc:
        logger.error("Failed to retrieve scan history: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scan history.",
        )


@router.get(
    "/stats",
    response_model=StatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve aggregated privacy protection metrics",
)
async def get_stats() -> StatsResponse:
    """Retrieve aggregated data leak prevention metrics.

    'leaks_averted' counts scans where sensitive PII was detected
    AND at least one item was redacted/protected.
    """
    try:
        stats_data = get_privacy_stats()
        return StatsResponse(
            success=True,
            stats=PrivacyStats(**stats_data),
        )
    except Exception as exc:
        logger.error("Failed to compute privacy stats: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute privacy statistics.",
        )

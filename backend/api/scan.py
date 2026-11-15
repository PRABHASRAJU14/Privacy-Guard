"""API router for PII scanning."""
import logging
from fastapi import APIRouter, HTTPException, status
from backend.schemas.scan import TextScanRequest, TextScanResponse
from backend.services.pii_detector import detect_pii
from backend.services.risk_engine import calculate_risk

logger = logging.getLogger("privacyguard.scan")
router = APIRouter(prefix="/api/scan", tags=["Scanning"])


@router.post(
    "/text",
    response_model=TextScanResponse,
    status_code=status.HTTP_200_OK,
    summary="Scan text for sensitive PII entities",
)
async def scan_text(payload: TextScanRequest) -> TextScanResponse:
    """Scan submitted text content and return detected PII entities with risk evaluation.
    Sensitive data is processed in memory and never logged to console or disk.
    """
    try:
        raw_text = payload.text
        if not raw_text or not raw_text.strip():
            # Gracefully return safe response for empty input
            empty_risk = calculate_risk([])
            return TextScanResponse(
                success=True,
                risk=empty_risk,
                detected=[],
                total_detected=0,
            )

        # Log metadata only - NEVER log raw content or PII
        logger.info("Processing text scan request. Content length: %d chars", len(raw_text))

        detected_entities = detect_pii(raw_text)
        risk_info = calculate_risk(detected_entities)

        logger.info(
            "Scan completed successfully. Total entities: %d, Risk Score: %d (%s)",
            len(detected_entities),
            risk_info.score,
            risk_info.level,
        )

        # Record scan history and audit event (safe metadata only)
        scan_id = None
        try:
            from backend.database.models import create_scan_record, record_audit_event
            scan_id = create_scan_record(
                input_type="text",
                risk_before=risk_info.score,
                detected_count=len(detected_entities),
                output_file_type="text",
            )
            record_audit_event(
                event_type="SCAN_COMPLETED",
                input_type="text",
                scan_id=scan_id,
                risk_before=risk_info.score,
                metadata={"entities_detected": len(detected_entities), "risk_level": risk_info.level},
            )
        except Exception as db_err:
            logger.warning("Failed to record scan history to DB: %s", db_err)

        return TextScanResponse(
            success=True,
            risk=risk_info,
            detected=detected_entities,
            total_detected=len(detected_entities),
            scan_id=scan_id,
        )

    except Exception as exc:
        logger.error("Scan processing encountered an error: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the scan request.",
        )

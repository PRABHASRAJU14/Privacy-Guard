"""API router for text protection and redaction."""
import hashlib
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from backend.schemas.protection import TextProtectRequest, TextProtectResponse, ProtectionReceipt
from backend.services.text_redactor import redact_text
from backend.services.risk_engine import calculate_risk

logger = logging.getLogger("privacyguard.protect")
router = APIRouter(prefix="/api/protect", tags=["Protection & Redaction"])


@router.post(
    "/text",
    response_model=TextProtectResponse,
    status_code=status.HTTP_200_OK,
    summary="Apply deterministic redaction to text",
)
async def protect_text_endpoint(payload: TextProtectRequest) -> TextProtectResponse:
    """Apply masking to protected entities in text based on purpose/user decisions.
    Original text is never logged to server logs.
    """
    try:
        raw_text = payload.text or ""
        detected = payload.detected or []
        decisions = payload.decisions or {}
        purpose = payload.purpose
        scan_id = payload.scan_id

        logger.info(
            "Executing text protection on %d chars with %d entities and %d decision overrides",
            len(raw_text),
            len(detected),
            len(decisions),
        )

        # 1. Perform deterministic redaction
        protected_text, protected_count, kept_count = redact_text(
            original_text=raw_text,
            detected_items=detected,
            decisions=decisions,
        )

        safe_to_share = (protected_count > 0 or len(detected) == 0)

        # 2. Deterministic Risk Before / After calculation
        risk_before = calculate_risk(detected).score if detected else 0

        # Kept items determine the residual risk
        kept_items = []
        for item in detected:
            decision = decisions.get(
                item.type.lower(),
                decisions.get(
                    item.label.lower(),
                    decisions.get(item.value, "PROTECT"),
                ),
            )
            if decision and decision.upper().strip() == "KEEP":
                kept_items.append(item)

        risk_after = calculate_risk(kept_items).score if kept_items else 0

        if risk_before > 0:
            exposure_reduction = round(((risk_before - risk_after) / risk_before) * 100.0, 1)
        else:
            exposure_reduction = 0.0

        # 3. Generate SHA-256 Protection Receipt for text
        receipt_hash = hashlib.sha256(protected_text.encode("utf-8")).hexdigest()
        receipt = ProtectionReceipt(algorithm="SHA-256", hash=receipt_hash)

        # 4. Record to Database (Safe metadata only)
        final_scan_id = scan_id
        try:
            from backend.database.models import (
                create_scan_record,
                update_scan_protection,
                record_audit_event,
            )

            if scan_id:
                update_scan_protection(
                    scan_id=scan_id,
                    purpose=purpose,
                    risk_after=risk_after,
                    protected_count=protected_count,
                    kept_count=kept_count,
                    output_file_type="text",
                    protection_receipt_hash=receipt_hash,
                )
            else:
                final_scan_id = create_scan_record(
                    input_type="text",
                    risk_before=risk_before,
                    risk_after=risk_after,
                    detected_count=len(detected),
                    protected_count=protected_count,
                    kept_count=kept_count,
                    purpose=purpose,
                    output_file_type="text",
                    protection_receipt_hash=receipt_hash,
                )

            record_audit_event(
                event_type="PROTECTION_APPLIED",
                input_type="text",
                scan_id=final_scan_id,
                purpose=purpose,
                risk_before=risk_before,
                risk_after=risk_after,
                protected_count=protected_count,
                metadata={
                    "exposure_reduction": exposure_reduction,
                    "protected_count": protected_count,
                    "kept_count": kept_count,
                },
            )
        except Exception as db_err:
            logger.warning("Database recording failed during text protection: %s", db_err)

        logger.info(
            "Text protection complete: %d protected, %d kept. Risk: %d -> %d (-%.1f%%). Safe to share: %s",
            protected_count,
            kept_count,
            risk_before,
            risk_after,
            exposure_reduction,
            safe_to_share,
        )

        return TextProtectResponse(
            success=True,
            original_text=raw_text,
            protected_text=protected_text,
            protected_count=protected_count,
            kept_count=kept_count,
            safe_to_share=safe_to_share,
            scan_id=final_scan_id,
            purpose=purpose,
            risk_before=risk_before,
            risk_after=risk_after,
            exposure_reduction=exposure_reduction,
            protection_receipt=receipt,
        )

    except Exception as exc:
        logger.error("Error executing text protection: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to redact and protect text.",
        )

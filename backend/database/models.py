"""Database models, queries, and privacy-first data access functions for PrivacyGuard."""
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from backend.database.database import get_db_connection

logger = logging.getLogger("privacyguard.models")

# Explicit list of forbidden keys to ensure zero PII leaks into SQLite
FORBIDDEN_PII_KEYS = {
    "aadhaar", "pan", "ssn", "bank_account", "card", "credit_card", "debit_card",
    "cvv", "upi", "phone", "email", "full_address", "address", "raw_text", "text",
    "ocr_text", "original_text", "content", "extracted_text"
}


def _verify_safe_metadata(data: Dict[str, Any]) -> None:
    """Enforce the Privacy-First Database Rule: reject any unapproved/PII keys."""
    if not isinstance(data, dict):
        return
    for k in data.keys():
        if k.lower() in FORBIDDEN_PII_KEYS:
            logger.error("Attempted to persist forbidden PII key '%s' to database!", k)
            raise ValueError(f"Privacy Violation: Cannot store sensitive key '{k}' in database.")


def create_scan_record(
    input_type: str,
    risk_before: int,
    detected_count: int,
    filename_hash: Optional[str] = None,
    purpose: Optional[str] = None,
    risk_after: Optional[int] = None,
    protected_count: int = 0,
    kept_count: Optional[int] = None,
    output_file_type: Optional[str] = None,
    protection_receipt_hash: Optional[str] = None,
    db_path: Optional[str] = None,
) -> int:
    """Record a scan operation in scan_history with safe metadata only."""
    now_iso = datetime.now(timezone.utc).isoformat()
    if risk_after is None:
        risk_after = risk_before
    if kept_count is None:
        kept_count = max(0, detected_count - protected_count)

    prot_percentage = 0.0
    if detected_count > 0:
        prot_percentage = round((protected_count / detected_count) * 100.0, 1)

    safe_to_share = 1 if (protected_count > 0 or detected_count == 0) else 0

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO scan_history (
                timestamp, input_type, filename_hash, purpose,
                risk_before, risk_after, detected_count, protected_count,
                kept_count, protection_percentage, safe_to_share,
                output_file_type, protection_receipt_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now_iso,
                input_type,
                filename_hash,
                purpose,
                risk_before,
                risk_after,
                detected_count,
                protected_count,
                kept_count,
                prot_percentage,
                safe_to_share,
                output_file_type,
                protection_receipt_hash,
            ),
        )
        scan_id = cursor.lastrowid

    logger.info(
        "Recorded scan_history [ID: %d, type: %s, detected: %d, risk: %d]",
        scan_id,
        input_type,
        detected_count,
        risk_before,
    )
    return scan_id


def update_scan_protection(
    scan_id: int,
    purpose: Optional[str],
    risk_after: int,
    protected_count: int,
    kept_count: int,
    output_file_type: str,
    protection_receipt_hash: str,
    db_path: Optional[str] = None,
) -> bool:
    """Update an existing scan history record with protection results and receipt hash."""
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        # Fetch original detected_count to recompute percentage
        cursor.execute("SELECT detected_count FROM scan_history WHERE id = ?", (scan_id,))
        row = cursor.fetchone()
        detected_count = row["detected_count"] if row else (protected_count + kept_count)

        prot_percentage = 0.0
        if detected_count > 0:
            prot_percentage = round((protected_count / detected_count) * 100.0, 1)

        safe_to_share = 1 if (protected_count > 0 or detected_count == 0) else 0

        cursor.execute(
            """
            UPDATE scan_history
            SET purpose = COALESCE(?, purpose),
                risk_after = ?,
                protected_count = ?,
                kept_count = ?,
                protection_percentage = ?,
                safe_to_share = ?,
                output_file_type = ?,
                protection_receipt_hash = ?
            WHERE id = ?
            """,
            (
                purpose,
                risk_after,
                protected_count,
                kept_count,
                prot_percentage,
                safe_to_share,
                output_file_type,
                protection_receipt_hash,
                scan_id,
            ),
        )
        return cursor.rowcount > 0


def record_audit_event(
    event_type: str,
    input_type: str,
    scan_id: Optional[int] = None,
    purpose: Optional[str] = None,
    risk_before: Optional[int] = None,
    risk_after: Optional[int] = None,
    protected_count: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
    db_path: Optional[str] = None,
) -> int:
    """Record an audit event (e.g. SCAN_COMPLETED, PROTECTION_APPLIED, SAFE_FILE_DOWNLOADED)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    meta_json = None

    if metadata:
        _verify_safe_metadata(metadata)
        meta_json = json.dumps(metadata)

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO audit_events (
                timestamp, event_type, scan_id, input_type,
                purpose, risk_before, risk_after, protected_count, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now_iso,
                event_type,
                scan_id,
                input_type,
                purpose,
                risk_before,
                risk_after,
                protected_count,
                meta_json,
            ),
        )
        event_id = cursor.lastrowid

    logger.info("Recorded audit_event [ID: %d, event: %s, scan_id: %s]", event_id, event_type, scan_id)
    return event_id


def get_history(limit: int = 20, db_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve recent scan history containing ONLY non-sensitive operational metadata."""
    limit = max(1, min(100, limit))

    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, timestamp, input_type, purpose, risk_before, risk_after,
                   detected_count, protected_count, kept_count, protection_percentage,
                   safe_to_share, output_file_type, protection_receipt_hash
            FROM scan_history
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()

    history = []
    for r in rows:
        history.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "input_type": r["input_type"],
            "purpose": r["purpose"],
            "risk_before": r["risk_before"],
            "risk_after": r["risk_after"],
            "detected_count": r["detected_count"],
            "protected_count": r["protected_count"],
            "kept_count": r["kept_count"],
            "protection_percentage": r["protection_percentage"],
            "safe_to_share": bool(r["safe_to_share"]),
            "output_file_type": r["output_file_type"],
            "protection_receipt_hash": r["protection_receipt_hash"],
        })
    return history


def get_privacy_stats(db_path: Optional[str] = None) -> Dict[str, Any]:
    """Calculate aggregated privacy and leak prevention metrics from SQLite.

    LEAKS_AVERTED DEFINITION:
    A scan counts as a prevented leak when:
      1. Sensitive PII data was detected (detected_count > 0)
      AND
      2. At least one sensitive item was protected/redacted (protected_count > 0).
    """
    with get_db_connection(db_path) as conn:
        cursor = conn.cursor()

        # 1. Total Scans and Counts by Input Type
        cursor.execute("SELECT COUNT(*) AS total FROM scan_history")
        total_scans = cursor.fetchone()["total"]

        cursor.execute(
            "SELECT input_type, COUNT(*) AS cnt FROM scan_history GROUP BY input_type"
        )
        type_counts = {row["input_type"]: row["cnt"] for row in cursor.fetchall()}
        text_scans = type_counts.get("text", 0)
        image_scans = type_counts.get("image", 0)
        pdf_scans = type_counts.get("pdf", 0)

        # 2. Protected Documents (scans where protection occurred)
        cursor.execute(
            "SELECT COUNT(*) AS protected_docs FROM scan_history WHERE protected_count > 0"
        )
        protected_documents = cursor.fetchone()["protected_docs"]

        # 3. Total Sensitive Items Detected & Protected
        cursor.execute(
            """
            SELECT COALESCE(SUM(detected_count), 0) AS total_detected,
                   COALESCE(SUM(protected_count), 0) AS total_protected
            FROM scan_history
            """
        )
        item_sums = cursor.fetchone()
        total_sensitive_items_detected = item_sums["total_detected"]
        total_sensitive_items_protected = item_sums["total_protected"]

        # 4. Leaks Averted (deterministic: detected > 0 AND protected > 0)
        cursor.execute(
            """
            SELECT COUNT(*) AS leaks_averted
            FROM scan_history
            WHERE detected_count > 0 AND protected_count > 0
            """
        )
        leaks_averted = cursor.fetchone()["leaks_averted"]

        # 5. Average Risk Scores
        cursor.execute("SELECT AVG(risk_before) AS avg_before FROM scan_history")
        avg_before_row = cursor.fetchone()
        average_risk_before = (
            round(avg_before_row["avg_before"], 1)
            if avg_before_row and avg_before_row["avg_before"] is not None
            else 0.0
        )

        cursor.execute(
            "SELECT AVG(risk_after) AS avg_after FROM scan_history WHERE protected_count > 0"
        )
        avg_after_row = cursor.fetchone()
        average_risk_after = (
            round(avg_after_row["avg_after"], 1)
            if avg_after_row and avg_after_row["avg_after"] is not None
            else 0.0
        )

        # 6. Average Exposure Reduction Percentage
        # Exposure reduction = ((risk_before - risk_after) / risk_before) * 100 for scans with risk_before > 0
        cursor.execute(
            """
            SELECT AVG(((CAST(risk_before AS REAL) - CAST(risk_after AS REAL)) / CAST(risk_before AS REAL)) * 100.0) AS avg_reduction
            FROM scan_history
            WHERE risk_before > 0 AND protected_count > 0
            """
        )
        reduction_row = cursor.fetchone()
        average_exposure_reduction = (
            round(reduction_row["avg_reduction"], 1)
            if reduction_row and reduction_row["avg_reduction"] is not None
            else 0.0
        )

    return {
        "total_scans": total_scans,
        "text_scans": text_scans,
        "image_scans": image_scans,
        "pdf_scans": pdf_scans,
        "protected_documents": protected_documents,
        "total_sensitive_items_detected": total_sensitive_items_detected,
        "total_sensitive_items_protected": total_sensitive_items_protected,
        "leaks_averted": leaks_averted,
        "average_risk_before": average_risk_before,
        "average_risk_after": average_risk_after,
        "average_exposure_reduction": average_exposure_reduction,
    }

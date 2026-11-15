"""API endpoints for protecting Image and PDF documents and secure file download."""
import os
import json
import hashlib
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from PIL import Image
import io

from backend.schemas.document import DocumentProtectResponse
from backend.schemas.protection import ProtectionReceipt
from backend.schemas.scan import DetectedPIIItem
from backend.services.image_redactor import redact_image_pixels, save_redacted_image
from backend.services.pdf_redactor import redact_pdf_document, save_redacted_pdf, extract_pdf_data
from backend.services.ocr import extract_text_and_boxes, find_entity_bbox
from backend.services.pii_detector import detect_pii
from backend.services.purpose_engine import analyze_purpose
from backend.services.risk_engine import calculate_risk, get_category, get_severity, get_risk_weight

logger = logging.getLogger("privacyguard.protect_file")

router = APIRouter(prefix="/api", tags=["Document Protection & Download"])

UPLOADS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"
)
PROTECTED_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "protected"
)
os.makedirs(UPLOADS_DIR, exist_ok=True)
PROTECTED_DIR.mkdir(parents=True, exist_ok=True) if hasattr(PROTECTED_DIR, "mkdir") else os.makedirs(PROTECTED_DIR, exist_ok=True)

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


def _is_safe_filename(name: str) -> bool:
    """Ensure filename has no path traversal components."""
    if not name or ".." in name or "/" in name or "\\" in name:
        return False
    return os.path.basename(name) == name


def _compute_risk_scores(detected_list: List[Any], decisions_dict: Dict[str, str]):
    """Deterministically calculate risk_before, risk_after, and exposure_reduction."""
    items_before = []
    items_kept = []

    for d in detected_list:
        if isinstance(d, dict):
            item_type = d.get("type", "unknown")
            item_val = d.get("value", "")
            cat = d.get("category") or get_category(item_type)
            sev = d.get("severity") or get_severity(item_type)
            rw = d.get("risk_weight") or get_risk_weight(item_type)
            label = d.get("label", item_type)
            start = d.get("start", 0)
            end = d.get("end", 0)
            conf = float(d.get("confidence", 0.95))
            valid = bool(d.get("valid", True))
            expl = d.get("explanation")
        elif hasattr(d, "type"):
            item_type = d.type
            item_val = getattr(d, "value", "")
            cat = getattr(d, "category", None) or get_category(item_type)
            sev = getattr(d, "severity", None) or get_severity(item_type)
            rw = getattr(d, "risk_weight", None) or get_risk_weight(item_type)
            label = getattr(d, "label", item_type)
            start = getattr(d, "start", 0)
            end = getattr(d, "end", 0)
            conf = float(getattr(d, "confidence", 0.95))
            valid = bool(getattr(d, "valid", True))
            expl = getattr(d, "explanation", None)
        else:
            continue

        pii_item = DetectedPIIItem(
            type=item_type,
            label=label,
            category=cat,
            value=item_val,
            start=start,
            end=end,
            severity=sev,
            risk_weight=rw,
            confidence=conf,
            valid=valid,
            explanation=expl,
        )
        items_before.append(pii_item)

        # Check decision: default is PROTECT unless explicitly KEEP
        dec = decisions_dict.get(
            item_type.lower(),
            decisions_dict.get(
                label.lower(),
                decisions_dict.get(item_val, "PROTECT"),
            ),
        )
        if dec and dec.upper().strip() == "KEEP":
            items_kept.append(pii_item)

    risk_before = calculate_risk(items_before).score if items_before else 0
    risk_after = calculate_risk(items_kept).score if items_kept else 0
    reduction = round(((risk_before - risk_after) / risk_before) * 100.0, 1) if risk_before > 0 else 0.0
    return risk_before, risk_after, reduction


@router.post("/protect/image", response_model=DocumentProtectResponse)
async def protect_image(
    file: Optional[UploadFile] = File(None),
    file_id: Optional[str] = Form(None),
    decisions: Optional[str] = Form(None),
    detected: Optional[str] = Form(None),
    purpose: Optional[str] = Form(None),
    scan_id: Optional[int] = Form(None),
):
    """Redact sensitive PII from an image document at the pixel level."""
    # 1. Obtain image data
    image_bytes = None
    orig_name = "document.png"

    if file:
        image_bytes = await file.read()
        orig_name = file.filename or "document.png"
    elif file_id:
        if not _is_safe_filename(file_id):
            raise HTTPException(status_code=400, detail="Invalid file ID format.")
        cached_path = os.path.join(UPLOADS_DIR, file_id)
        if not os.path.exists(cached_path):
            raise HTTPException(status_code=404, detail="Referenced upload was not found.")
        with open(cached_path, "rb") as f:
            image_bytes = f.read()
        orig_name = file_id
    else:
        raise HTTPException(
            status_code=400,
            detail="Either an image file or a valid file_id must be provided.",
        )

    if not image_bytes or len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image is empty or exceeds size limit.")

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image content: {str(e)}")

    # 2. Parse decisions and detected entities
    decisions_dict: Dict[str, str] = {}
    if decisions:
        try:
            decisions_dict = json.loads(decisions)
        except Exception:
            pass

    detected_list: List[Dict[str, Any]] = []
    if detected:
        try:
            detected_list = json.loads(detected)
        except Exception:
            pass

    # If detected list was not supplied, run OCR + detector on the image
    if not detected_list:
        try:
            ocr_res = extract_text_and_boxes(image)
            raw_entities = detect_pii(ocr_res["text"])
            for e in raw_entities:
                b = find_entity_bbox(e.value, ocr_res["words"])
                detected_list.append({
                    "type": e.type,
                    "label": e.label,
                    "value": e.value,
                    "bbox": b,
                    "decision": "PROTECT",
                })
        except Exception as e:
            logger.warning(f"On-the-fly OCR during protect failed: {e}")

    # If purpose was specified and decisions_dict is empty, resolve with purpose engine
    if purpose and not decisions_dict:
        purpose_analysis = analyze_purpose(purpose, [
            detect_pii(d.get("value", ""))[0] if detect_pii(d.get("value", "")) else None
            for d in detected_list
        ])
        for r in purpose_analysis.recommendations:
            decisions_dict[r.type.lower()] = r.decision

    # 3. Perform real pixel-level redaction
    redacted_image, protected_cnt, kept_cnt = redact_image_pixels(
        image, detected_list, decisions_dict
    )

    # 4. Save protected file
    out_path = save_redacted_image(redacted_image, orig_name)
    saved_filename = os.path.basename(out_path)

    # 5. Calculate SHA-256 Protection Receipt from saved file bytes
    with open(out_path, "rb") as f:
        protected_bytes = f.read()
    receipt_hash = hashlib.sha256(protected_bytes).hexdigest()
    receipt = ProtectionReceipt(algorithm="SHA-256", hash=receipt_hash)

    # 6. Deterministic risk before / after
    risk_before, risk_after, exposure_reduction = _compute_risk_scores(detected_list, decisions_dict)

    # 7. Record to Database (Safe metadata only)
    final_scan_id = scan_id
    try:
        from backend.database.models import create_scan_record, update_scan_protection, record_audit_event
        ext = os.path.splitext(saved_filename)[1].lstrip(".").lower() or "png"

        if scan_id:
            update_scan_protection(
                scan_id=scan_id,
                purpose=purpose,
                risk_after=risk_after,
                protected_count=protected_cnt,
                kept_count=kept_cnt,
                output_file_type=ext,
                protection_receipt_hash=receipt_hash,
            )
        else:
            final_scan_id = create_scan_record(
                input_type="image",
                risk_before=risk_before,
                risk_after=risk_after,
                detected_count=len(detected_list),
                protected_count=protected_cnt,
                kept_count=kept_cnt,
                purpose=purpose,
                output_file_type=ext,
                protection_receipt_hash=receipt_hash,
            )

        record_audit_event(
            event_type="FILE_PROTECTED",
            input_type="image",
            scan_id=final_scan_id,
            purpose=purpose,
            risk_before=risk_before,
            risk_after=risk_after,
            protected_count=protected_cnt,
            metadata={
                "exposure_reduction": exposure_reduction,
                "saved_filename": saved_filename,
            },
        )
    except Exception as db_err:
        logger.warning("Database recording failed during image protect: %s", db_err)

    logger.info(
        f"Image protected successfully: {saved_filename}, protected {protected_cnt} items. Risk: {risk_before} -> {risk_after} (-{exposure_reduction}%)"
    )

    return DocumentProtectResponse(
        success=True,
        filename=saved_filename,
        protected_count=protected_cnt,
        kept_count=kept_cnt,
        download_url=f"/api/download/{saved_filename}",
        scan_id=final_scan_id,
        purpose=purpose,
        risk_before=risk_before,
        risk_after=risk_after,
        exposure_reduction=exposure_reduction,
        protection_receipt=receipt,
    )


@router.post("/protect/pdf", response_model=DocumentProtectResponse)
async def protect_pdf(
    file: Optional[UploadFile] = File(None),
    file_id: Optional[str] = Form(None),
    decisions: Optional[str] = Form(None),
    detected: Optional[str] = Form(None),
    purpose: Optional[str] = Form(None),
    scan_id: Optional[int] = Form(None),
):
    """Redact sensitive PII from a PDF document permanently eradicating text streams."""
    pdf_bytes = None
    orig_name = "document.pdf"

    if file:
        pdf_bytes = await file.read()
        orig_name = file.filename or "document.pdf"
    elif file_id:
        if not _is_safe_filename(file_id):
            raise HTTPException(status_code=400, detail="Invalid file ID format.")
        cached_path = os.path.join(UPLOADS_DIR, file_id)
        if not os.path.exists(cached_path):
            raise HTTPException(status_code=404, detail="Referenced upload was not found.")
        with open(cached_path, "rb") as f:
            pdf_bytes = f.read()
        orig_name = file_id
    else:
        raise HTTPException(
            status_code=400,
            detail="Either a PDF file or a valid file_id must be provided.",
        )

    if not pdf_bytes or len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="PDF is empty or exceeds size limit.")

    # 1. Parse decisions and detected entities
    decisions_dict: Dict[str, str] = {}
    if decisions:
        try:
            decisions_dict = json.loads(decisions)
        except Exception:
            pass

    detected_list: List[Dict[str, Any]] = []
    if detected:
        try:
            detected_list = json.loads(detected)
        except Exception:
            pass

    # If detected entities not provided, extract on the fly
    if not detected_list:
        pdf_data = extract_pdf_data(pdf_bytes)
        detected_list = pdf_data.get("detected", [])

    # If purpose was specified and decisions_dict is empty, resolve with purpose engine
    if purpose and not decisions_dict:
        purpose_analysis = analyze_purpose(purpose, [
            detect_pii(d.get("value", ""))[0] if detect_pii(d.get("value", "")) else None
            for d in detected_list
        ])
        for r in purpose_analysis.recommendations:
            decisions_dict[r.type.lower()] = r.decision

    # 2. Perform real PDF redaction
    try:
        redacted_bytes, protected_cnt, kept_cnt = redact_pdf_document(
            pdf_bytes, detected_list, decisions_dict
        )
    except Exception as e:
        logger.error(f"PDF redaction failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF redaction error: {str(e)}")

    # 3. Save protected PDF
    out_path = save_redacted_pdf(redacted_bytes, orig_name)
    saved_filename = os.path.basename(out_path)

    # 4. Calculate SHA-256 Protection Receipt from binary bytes
    receipt_hash = hashlib.sha256(redacted_bytes).hexdigest()
    receipt = ProtectionReceipt(algorithm="SHA-256", hash=receipt_hash)

    # 5. Deterministic risk before / after
    risk_before, risk_after, exposure_reduction = _compute_risk_scores(detected_list, decisions_dict)

    # 6. Record to Database (Safe metadata only)
    final_scan_id = scan_id
    try:
        from backend.database.models import create_scan_record, update_scan_protection, record_audit_event

        if scan_id:
            update_scan_protection(
                scan_id=scan_id,
                purpose=purpose,
                risk_after=risk_after,
                protected_count=protected_cnt,
                kept_count=kept_cnt,
                output_file_type="pdf",
                protection_receipt_hash=receipt_hash,
            )
        else:
            final_scan_id = create_scan_record(
                input_type="pdf",
                risk_before=risk_before,
                risk_after=risk_after,
                detected_count=len(detected_list),
                protected_count=protected_cnt,
                kept_count=kept_cnt,
                purpose=purpose,
                output_file_type="pdf",
                protection_receipt_hash=receipt_hash,
            )

        record_audit_event(
            event_type="FILE_PROTECTED",
            input_type="pdf",
            scan_id=final_scan_id,
            purpose=purpose,
            risk_before=risk_before,
            risk_after=risk_after,
            protected_count=protected_cnt,
            metadata={
                "exposure_reduction": exposure_reduction,
                "saved_filename": saved_filename,
            },
        )
    except Exception as db_err:
        logger.warning("Database recording failed during PDF protect: %s", db_err)

    logger.info(
        f"PDF protected successfully: {saved_filename}, protected {protected_cnt} items. Risk: {risk_before} -> {risk_after} (-{exposure_reduction}%)"
    )

    return DocumentProtectResponse(
        success=True,
        filename=saved_filename,
        protected_count=protected_cnt,
        kept_count=kept_cnt,
        download_url=f"/api/download/{saved_filename}",
        scan_id=final_scan_id,
        purpose=purpose,
        risk_before=risk_before,
        risk_after=risk_after,
        exposure_reduction=exposure_reduction,
        protection_receipt=receipt,
    )


@router.get("/download/{filename}")
async def download_file(filename: str):
    """Safely download a protected file with path-traversal protection."""
    if not _is_safe_filename(filename):
        raise HTTPException(status_code=400, detail="Invalid filename format.")

    file_path = os.path.join(PROTECTED_DIR, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found or expired.")

    ext = os.path.splitext(filename)[1].lower()
    media_type = "application/octet-stream"
    if ext == ".png":
        media_type = "image/png"
    elif ext in [".jpg", ".jpeg"]:
        media_type = "image/jpeg"
    elif ext == ".pdf":
        media_type = "application/pdf"

    # Record safe download audit event
    try:
        from backend.database.models import record_audit_event
        record_audit_event(
            event_type="SAFE_FILE_DOWNLOADED",
            input_type=ext.lstrip("."),
            metadata={"filename": filename},
        )
    except Exception as db_err:
        logger.warning("Database recording failed for download event: %s", db_err)

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

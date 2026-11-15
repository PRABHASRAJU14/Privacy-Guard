"""API endpoints for scanning Image and PDF documents."""
import os
import uuid
import io
import logging
from typing import Optional, Tuple, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from PIL import Image

from backend.schemas.document import (
    ImageScanResponse,
    PdfScanResponse,
    DetectedDocumentItem,
    BBox,
)
from backend.services.ocr import (
    is_ocr_available,
    extract_text_and_boxes,
    find_entity_bbox,
)
from backend.services.pii_detector import detect_pii
from backend.services.risk_engine import calculate_risk
from backend.services.pdf_redactor import extract_pdf_data

logger = logging.getLogger("privacyguard.scan_file")

router = APIRouter(prefix="/api/scan", tags=["Multimodal Scanning"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_IMAGE_EXTS = {".png", ".jpg", ".jpeg"}
ALLOWED_PDF_EXTS = {".pdf"}

UPLOADS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads"
)
os.makedirs(UPLOADS_DIR, exist_ok=True)


def _validate_file_upload(file: UploadFile, allowed_exts: set) -> Tuple[str, str]:
    """Validate file extension and generate a safe storage name.
    Returns (safe_filename, ext).
    """
    raw_name = file.filename or "unknown"
    ext = os.path.splitext(raw_name)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{ext}'. Allowed extensions: {', '.join(sorted(allowed_exts))}",
        )
    safe_name = f"upload_{uuid.uuid4().hex[:12]}{ext}"
    return safe_name, ext


@router.post("/image", response_model=ImageScanResponse)
async def scan_image(file: UploadFile = File(...)):
    """Scan an uploaded screenshot or image (PNG, JPG, JPEG) for PII using local OCR."""
    safe_name, ext = _validate_file_upload(file, ALLOWED_IMAGE_EXTS)

    # 1. Read file content with size check
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB",
        )
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image file is empty.",
        )

    # 2. Check OCR readiness
    ocr_ready, ocr_err = is_ocr_available()
    if not ocr_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ocr_err or "Tesseract OCR engine is not installed or configured on this server.",
        )

    # 3. Load image
    try:
        image = Image.open(io.BytesIO(content))
        image.load()
    except Exception as e:
        logger.error(f"Failed to decode image: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Could not decode image.",
        )

    # Save temp upload for subsequent protection
    temp_path = os.path.join(UPLOADS_DIR, safe_name)
    with open(temp_path, "wb") as f:
        f.write(content)

    # 4. Run local OCR
    try:
        ocr_result = extract_text_and_boxes(image)
    except Exception as e:
        logger.error(f"OCR execution failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {str(e)}",
        )

    extracted_text = ocr_result.get("text", "")
    word_boxes = ocr_result.get("words", [])

    # 5. Run deterministic PII detection and risk assessment
    raw_entities = detect_pii(extracted_text)
    risk_info = calculate_risk(raw_entities)

    # 6. Map entities to bounding boxes in the image
    detected_items = []
    for entity in raw_entities:
        box_coords = find_entity_bbox(entity.value, word_boxes)
        bbox = BBox(**box_coords) if box_coords else None

        detected_items.append(
            DetectedDocumentItem(
                type=entity.type,
                label=entity.label,
                category=entity.category,
                value=entity.value,
                start=entity.start,
                end=entity.end,
                severity=entity.severity,
                risk_weight=entity.risk_weight,
                confidence=entity.confidence,
                valid=entity.valid,
                page=1,
                bbox=bbox,
                decision="PROTECT",
                explanation=entity.explanation,
            )
        )

    logger.info(f"Image scan completed. File ID: {safe_name}, Entities detected: {len(detected_items)}, Risk: {risk_info.level}")

    # Record scan history and audit event (safe metadata only)
    scan_id = None
    try:
        import hashlib
        from backend.database.models import create_scan_record, record_audit_event
        orig_fname = file.filename or safe_name
        fname_hash = hashlib.sha256(orig_fname.encode("utf-8")).hexdigest()
        scan_id = create_scan_record(
            input_type="image",
            risk_before=risk_info.score,
            detected_count=len(detected_items),
            filename_hash=fname_hash,
            output_file_type=ext.lstrip("."),
        )
        record_audit_event(
            event_type="SCAN_COMPLETED",
            input_type="image",
            scan_id=scan_id,
            risk_before=risk_info.score,
            metadata={"entities_detected": len(detected_items), "risk_level": risk_info.level},
        )
    except Exception as db_err:
        logger.warning("Failed to record image scan to DB: %s", db_err)

    return ImageScanResponse(
        success=True,
        file_type="image",
        filename=file.filename or safe_name,
        file_id=safe_name,
        text=extracted_text,
        risk=risk_info,
        detected=detected_items,
        total_detected=len(detected_items),
        scan_id=scan_id,
    )


@router.post("/pdf", response_model=PdfScanResponse)
async def scan_pdf(file: UploadFile = File(...)):
    """Scan an uploaded PDF document for PII using PyMuPDF."""
    safe_name, ext = _validate_file_upload(file, ALLOWED_PDF_EXTS)

    # 1. Read file content with size check
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB",
        )
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded PDF file is empty.",
        )

    # Save temp upload for subsequent protection
    temp_path = os.path.join(UPLOADS_DIR, safe_name)
    with open(temp_path, "wb") as f:
        f.write(content)

    # 2. Extract PDF text and entities
    try:
        pdf_data = extract_pdf_data(content)
    except Exception as e:
        logger.error(f"PDF parsing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse PDF document: {str(e)}",
        )

    detected_items = []
    for d in pdf_data.get("detected", []):
        bbox = BBox(**d["bbox"]) if d.get("bbox") else None
        detected_items.append(
            DetectedDocumentItem(
                type=d["type"],
                label=d["label"],
                category=d["category"],
                value=d["value"],
                start=d.get("start", 0),
                end=d.get("end", 0),
                severity=d["severity"],
                risk_weight=d["risk_weight"],
                confidence=d["confidence"],
                valid=d["valid"],
                page=d.get("page", 1),
                bbox=bbox,
                decision="PROTECT",
                explanation=d.get("explanation"),
            )
        )

    logger.info(f"PDF scan completed. File ID: {safe_name}, Pages: {pdf_data['page_count']}, Entities: {len(detected_items)}")

    # Record scan history and audit event (safe metadata only)
    scan_id = None
    try:
        import hashlib
        from backend.database.models import create_scan_record, record_audit_event
        orig_fname = file.filename or safe_name
        fname_hash = hashlib.sha256(orig_fname.encode("utf-8")).hexdigest()
        risk_val = (
            pdf_data["risk"].score
            if hasattr(pdf_data["risk"], "score")
            else (pdf_data["risk"].get("score", 0) if isinstance(pdf_data["risk"], dict) else 0)
        )
        scan_id = create_scan_record(
            input_type="pdf",
            risk_before=risk_val,
            detected_count=len(detected_items),
            filename_hash=fname_hash,
            output_file_type="pdf",
        )
        record_audit_event(
            event_type="SCAN_COMPLETED",
            input_type="pdf",
            scan_id=scan_id,
            risk_before=risk_val,
            metadata={"entities_detected": len(detected_items), "pages": pdf_data["page_count"]},
        )
    except Exception as db_err:
        logger.warning("Failed to record PDF scan to DB: %s", db_err)

    return PdfScanResponse(
        success=True,
        file_type="pdf",
        filename=file.filename or safe_name,
        file_id=safe_name,
        page_count=pdf_data["page_count"],
        text=pdf_data["text"],
        risk=pdf_data["risk"],
        detected=detected_items,
        total_detected=len(detected_items),
        scan_id=scan_id,
    )

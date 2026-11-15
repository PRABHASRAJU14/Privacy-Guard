"""Deterministic Real PDF Processing & Redaction Service for PrivacyGuard.
Extracts text and applies true PDF redactions using PyMuPDF (pymupdf).
Underlying text streams are permanently eradicated from the PDF structure.
"""
import os
import uuid
import logging
from typing import List, Dict, Any, Tuple, Optional
import pymupdf

from backend.services.pii_detector import detect_pii
from backend.services.risk_engine import calculate_risk

logger = logging.getLogger("privacyguard.pdf_redactor")

PROTECTED_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "protected"
)
os.makedirs(PROTECTED_DIR, exist_ok=True)


def extract_pdf_data(pdf_bytes: bytes) -> Dict[str, Any]:
    """Extract text, scan PII, and calculate page coordinates across all PDF pages."""
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    total_pages = len(doc)

    full_document_text = []
    all_detected_items = []
    all_detected_dicts = []

    for page_num in range(total_pages):
        page = doc[page_num]
        page_text = page.get_text()
        full_document_text.append(page_text)

        # Run deterministic PII detector on this page's text
        page_entities = detect_pii(page_text)
        all_detected_items.extend(page_entities)

        for entity in page_entities:
            raw_val = entity.value
            rects = page.search_for(raw_val)

            bbox = None
            if rects:
                r = rects[0]
                bbox = {
                    "left": round(r.x0, 2),
                    "top": round(r.y0, 2),
                    "width": round(r.width, 2),
                    "height": round(r.height, 2),
                }
            else:
                words = raw_val.split()
                if words:
                    w_rects = page.search_for(words[0])
                    if w_rects:
                        r = w_rects[0]
                        bbox = {
                            "left": round(r.x0, 2),
                            "top": round(r.y0, 2),
                            "width": round(r.width * len(words), 2),
                            "height": round(r.height, 2),
                        }

            e_dict = entity.model_dump()
            e_dict["page"] = page_num + 1
            e_dict["bbox"] = bbox
            all_detected_dicts.append(e_dict)

    doc.close()

    combined_text = "\n\n".join(full_document_text)
    risk_info = calculate_risk(all_detected_items)

    return {
        "page_count": total_pages,
        "text": combined_text.strip(),
        "detected": all_detected_dicts,
        "risk": risk_info.model_dump() if hasattr(risk_info, "model_dump") else risk_info,
        "total_detected": len(all_detected_dicts),
    }


def redact_pdf_document(
    pdf_bytes: bytes,
    detected_entities: List[Dict[str, Any]],
    decisions: Optional[Dict[str, str]] = None,
    fill_color: Tuple[float, float, float] = (0.08, 0.09, 0.13),  # dark solid fill
) -> Tuple[bytes, int, int]:
    """Apply true PDF redaction annotations and permanently eradicate text streams.
    Returns (redacted_pdf_bytes, protected_count, kept_count).
    """
    decisions = decisions or {}
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")

    protected_count = 0
    kept_count = 0

    # Group entities to protect by page
    pages_to_redact: Dict[int, List[Dict[str, Any]]] = {}

    for entity in detected_entities:
        t = entity.get("type", "").lower()
        val = entity.get("value", "")

        # Determine decision
        item_decision = (
            decisions.get(t)
            or decisions.get(val)
            or entity.get("decision", "PROTECT")
        )
        if str(item_decision).upper() != "PROTECT":
            kept_count += 1
            continue

        p_num = int(entity.get("page", 1)) - 1
        if 0 <= p_num < len(doc):
            pages_to_redact.setdefault(p_num, []).append(entity)
            protected_count += 1

    # Apply redactions page by page
    for page_num, entities_for_page in pages_to_redact.items():
        page = doc[page_num]

        for item in entities_for_page:
            val = item.get("value", "")
            bbox = item.get("bbox")

            # Try precise text search first
            found_rects = page.search_for(val) if val else []

            if found_rects:
                for r in found_rects:
                    page.add_redact_annot(r, fill=fill_color)
            elif bbox:
                # Use bounding box coordinates
                l = bbox.get("left", 0)
                t = bbox.get("top", 0)
                w = bbox.get("width", 0)
                h = bbox.get("height", 0)
                if w > 0 and h > 0:
                    rect = pymupdf.Rect(l, t, l + w, t + h)
                    page.add_redact_annot(rect, fill=fill_color)

        # Permanently apply redactions to this page
        page.apply_redactions()

    # Save to memory bytes
    output_bytes = doc.tobytes(garbage=4, deflate=True)
    doc.close()

    return output_bytes, protected_count, kept_count


def verify_pdf_redaction(
    redacted_pdf_bytes: bytes, protected_values: List[str]
) -> bool:
    """Verify that protected values are completely unextractable from the redacted PDF."""
    doc = pymupdf.open(stream=redacted_pdf_bytes, filetype="pdf")
    combined_text = ""
    for page in doc:
        combined_text += page.get_text() + " "
    doc.close()

    for val in protected_values:
        if val and len(val.strip()) > 3 and val.strip() in combined_text:
            logger.warning(f"Verification failure: text fragment still present in PDF stream: {val[:3]}...")
            return False
    return True


def save_redacted_pdf(
    pdf_bytes: bytes, original_filename: str = "document.pdf"
) -> str:
    """Save redacted PDF with a safe UUID filename to backend/protected/."""
    safe_name = f"protected_{uuid.uuid4().hex[:12]}.pdf"
    out_path = os.path.join(PROTECTED_DIR, safe_name)
    with open(out_path, "wb") as f:
        f.write(pdf_bytes)
    logger.info(f"Protected PDF saved to: {safe_name}")
    return out_path

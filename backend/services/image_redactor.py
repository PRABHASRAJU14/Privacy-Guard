"""Deterministic Real Image Redaction Service for PrivacyGuard.
Applies true pixel-level redaction on PNG/JPG images.
Does not use CSS mocks or superficial filters — pixels are permanently overwritten.
"""
import os
import uuid
import logging
from typing import List, Dict, Any, Tuple, Optional
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger("privacyguard.image_redactor")

PROTECTED_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "protected"
)
os.makedirs(PROTECTED_DIR, exist_ok=True)


def redact_image_pixels(
    image: Image.Image,
    detected_entities: List[Dict[str, Any]],
    decisions: Optional[Dict[str, str]] = None,
    fill_color: Tuple[int, int, int] = (20, 24, 33),
    padding: int = 4,
) -> Tuple[Image.Image, int, int]:
    """Apply real pixel redaction rectangles over all entities designated as PROTECT.
    Returns (redacted_image, protected_count, kept_count).
    """
    decisions = decisions or {}
    redacted = image.copy().convert("RGB")
    draw = ImageDraw.Draw(redacted)

    img_width, img_height = redacted.size
    protected_count = 0
    kept_count = 0

    for entity in detected_entities:
        t = entity.get("type", "").lower()
        val = entity.get("value", "")

        # Determine decision: check decisions dict or item's own 'decision'
        item_decision = (
            decisions.get(t)
            or decisions.get(val)
            or entity.get("decision", "PROTECT")
        )
        if str(item_decision).upper() != "PROTECT":
            kept_count += 1
            continue

        bbox = entity.get("bbox")
        if not bbox:
            continue

        left = int(bbox.get("left", 0))
        top = int(bbox.get("top", 0))
        width = int(bbox.get("width", 0))
        height = int(bbox.get("height", 0))

        if width <= 0 or height <= 0:
            continue

        # Add slight padding for complete pixel coverage
        x0 = max(0, left - padding)
        y0 = max(0, top - padding // 2)
        x1 = min(img_width, left + width + padding)
        y1 = min(img_height, top + height + padding // 2)

        # Permanent pixel overwrite: draw solid opaque rectangle
        draw.rectangle([x0, y0, x1, y1], fill=fill_color, outline=fill_color)
        protected_count += 1

    return redacted, protected_count, kept_count


def save_redacted_image(
    image: Image.Image,
    original_filename: str = "document.png",
    format_name: str = "PNG",
) -> str:
    """Save redacted image with a safe UUID filename to backend/protected/.
    Returns the absolute path to the saved protected image.
    """
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg"]:
        ext = ".png"

    safe_name = f"protected_{uuid.uuid4().hex[:12]}{ext}"
    out_path = os.path.join(PROTECTED_DIR, safe_name)

    save_fmt = "JPEG" if ext in [".jpg", ".jpeg"] else "PNG"
    image.save(out_path, format=save_fmt, quality=95)
    logger.info(f"Protected image saved to: {safe_name} (original was {ext})")
    return out_path

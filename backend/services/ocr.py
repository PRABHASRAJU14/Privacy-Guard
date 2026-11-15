"""Deterministic Local OCR Service for PrivacyGuard.
Extracts text and word/block-level bounding boxes using local Tesseract OCR.
No external AI or cloud APIs are used.
"""
import os
import shutil
import logging
import subprocess
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageOps

logger = logging.getLogger("privacyguard.ocr")

# Candidate paths on Windows and Unix systems (64-bit official locations first)
DEFAULT_TESSERACT_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
    os.path.expandvars(r"%PROGRAMFILES%\Tesseract-OCR\tesseract.exe"),
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files\Autopsy-4.22.1\autopsy\Tesseract-OCR\tesseract.exe",
    "/usr/bin/tesseract",
    "/usr/local/bin/tesseract",
    "/opt/homebrew/bin/tesseract",
]

_TESSERACT_INITIALIZED = False
_TESSERACT_AVAILABLE = False
_TESSERACT_PATH: Optional[str] = None
_TESSERACT_ERROR_MSG: Optional[str] = None


def _is_executable_functional(path: str) -> bool:
    """Verify that the Tesseract binary exists AND can execute successfully.
    Prevents selecting broken 32-bit binaries or DLL-relocation crashing builds.
    """
    if not path or not os.path.exists(path):
        return False
    try:
        res = subprocess.run(
            [path, "--version"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=3,
        )
        return res.returncode == 0
    except Exception as exc:
        logger.warning("Tesseract candidate at '%s' failed functional test: %s", path, exc)
        return False


def init_tesseract() -> Tuple[bool, Optional[str]]:
    """Locate, functionally verify, and configure local Tesseract OCR executable."""
    global _TESSERACT_INITIALIZED, _TESSERACT_AVAILABLE, _TESSERACT_PATH, _TESSERACT_ERROR_MSG
    if _TESSERACT_INITIALIZED:
        return _TESSERACT_AVAILABLE, _TESSERACT_PATH

    _TESSERACT_INITIALIZED = True

    # 1. Check custom environment variable
    custom_path = os.environ.get("TESSERACT_PATH")
    if custom_path and _is_executable_functional(custom_path):
        _TESSERACT_PATH = custom_path
    else:
        # 2. Check system PATH
        which_path = shutil.which("tesseract")
        if which_path and _is_executable_functional(which_path):
            _TESSERACT_PATH = which_path
        else:
            # 3. Check known default locations
            for candidate in DEFAULT_TESSERACT_PATHS:
                if os.path.exists(candidate) and _is_executable_functional(candidate):
                    _TESSERACT_PATH = candidate
                    break

    if _TESSERACT_PATH:
        try:
            import pytesseract
            pytesseract.pytesseract.tesseract_cmd = _TESSERACT_PATH

            # Set TESSDATA_PREFIX if adjacent tessdata directory exists
            tess_dir = os.path.dirname(_TESSERACT_PATH)
            adjacent_tessdata = os.path.join(tess_dir, "tessdata")
            if os.path.exists(adjacent_tessdata) and not os.environ.get("TESSDATA_PREFIX"):
                os.environ["TESSDATA_PREFIX"] = adjacent_tessdata

            _TESSERACT_AVAILABLE = True
            logger.info("Tesseract OCR initialized and verified successfully at: %s", _TESSERACT_PATH)
        except Exception as e:
            _TESSERACT_AVAILABLE = False
            _TESSERACT_ERROR_MSG = f"Failed to configure pytesseract with {_TESSERACT_PATH}: {str(e)}"
            logger.error(_TESSERACT_ERROR_MSG)
    else:
        _TESSERACT_AVAILABLE = False
        _TESSERACT_ERROR_MSG = (
            "Local 64-bit Tesseract OCR executable was not found or is incompatible on this system. "
            "To enable image and screenshot scanning, download and install the official 64-bit Tesseract OCR from: "
            "https://github.com/UB-Mannheim/tesseract/wiki (installs to C:\\Program Files\\Tesseract-OCR)."
        )
        logger.warning(_TESSERACT_ERROR_MSG)

    return _TESSERACT_AVAILABLE, _TESSERACT_PATH


def is_ocr_available() -> Tuple[bool, Optional[str]]:
    """Check if local OCR engine is ready."""
    return init_tesseract()


def get_ocr_status() -> Dict[str, Any]:
    """Return structured OCR readiness information."""
    available, path = is_ocr_available()
    return {
        "available": available,
        "engine": "Tesseract OCR (Local)",
        "executable_path": path,
        "error": _TESSERACT_ERROR_MSG if not available else None,
    }


def extract_text_and_boxes(image: Image.Image) -> Dict[str, Any]:
    """Run local OCR on PIL Image.
    Returns extracted text, block-level boxes, and word-level boxes with coordinates.
    """
    available, _ = is_ocr_available()
    if not available:
        raise RuntimeError(
            _TESSERACT_ERROR_MSG or "Tesseract OCR is not installed or configured."
        )

    import pytesseract

    # Correct EXIF rotation (critical for camera photos / phone screenshots in JPG)
    try:
        image = ImageOps.exif_transpose(image)
    except Exception:
        pass

    # Ensure RGB color space for reliable character segmentation
    if image.mode != "RGB":
        image = image.convert("RGB")

    # 1. Extract plain text (LSTM engine with auto segmentation)
    full_text = pytesseract.image_to_string(image, config="--oem 3 --psm 3")

    # 2. Extract detailed word data with coordinates
    data = pytesseract.image_to_data(image, config="--oem 3 --psm 3", output_type=pytesseract.Output.DICT)

    words = []
    blocks_dict: Dict[int, List[Dict[str, Any]]] = {}

    n_boxes = len(data["text"])
    for i in range(n_boxes):
        raw_word = data["text"][i].strip()
        conf = int(data["conf"][i]) if str(data["conf"][i]).replace("-", "").isdigit() else 0

        if not raw_word or conf <= 0:
            continue

        w_box = {
            "text": raw_word,
            "left": int(data["left"][i]),
            "top": int(data["top"][i]),
            "width": int(data["width"][i]),
            "height": int(data["height"][i]),
            "confidence": conf,
            "block_num": int(data["block_num"][i]),
            "line_num": int(data["line_num"][i]),
        }
        words.append(w_box)

        block_num = int(data["block_num"][i])
        blocks_dict.setdefault(block_num, []).append(w_box)

    # 3. Aggregate into blocks with bounding rectangles
    blocks = []
    for b_num, b_words in blocks_dict.items():
        if not b_words:
            continue
        min_l = min(w["left"] for w in b_words)
        min_t = min(w["top"] for w in b_words)
        max_r = max(w["left"] + w["width"] for w in b_words)
        max_b = max(w["top"] + w["height"] for w in b_words)
        avg_conf = sum(w["confidence"] for w in b_words) // len(b_words)

        blocks.append({
            "text": " ".join(w["text"] for w in b_words),
            "left": min_l,
            "top": min_t,
            "width": max_r - min_l,
            "height": max_b - min_t,
            "confidence": avg_conf,
            "block_num": b_num,
        })

    return {
        "text": full_text.strip(),
        "blocks": blocks,
        "words": words,
    }


def find_entity_bbox(
    entity_value: str, word_boxes: List[Dict[str, Any]]
) -> Optional[Dict[str, int]]:
    """Match a detected PII value against OCR word boxes and return its bounding box.
    Handles single-word and multi-word phrases by finding the best continuous span.
    """
    if not entity_value or not word_boxes:
        return None

    import re

    clean_target = re.sub(r"[^\w]", "", entity_value).lower()
    if not clean_target:
        return None

    # Try 1: Exact single-word match
    for w in word_boxes:
        clean_word = re.sub(r"[^\w]", "", w["text"]).lower()
        if clean_target == clean_word or (len(clean_target) >= 4 and clean_target in clean_word):
            return {
                "left": w["left"],
                "top": w["top"],
                "width": w["width"],
                "height": w["height"],
            }

    # Try 2: Multi-word continuous span search
    target_words = [re.sub(r"[^\w]", "", tw).lower() for tw in entity_value.split() if re.sub(r"[^\w]", "", tw)]
    if not target_words:
        return None

    w_count = len(word_boxes)
    t_count = len(target_words)

    for i in range(w_count):
        match = True
        span = []
        for j in range(t_count):
            if i + j >= w_count:
                match = False
                break
            box_clean = re.sub(r"[^\w]", "", word_boxes[i + j]["text"]).lower()
            if target_words[j] != box_clean and target_words[j] not in box_clean and box_clean not in target_words[j]:
                match = False
                break
            span.append(word_boxes[i + j])

        if match and span:
            min_l = min(w["left"] for w in span)
            min_t = min(w["top"] for w in span)
            max_r = max(w["left"] + w["width"] for w in span)
            max_b = max(w["top"] + w["height"] for w in span)
            return {
                "left": min_l,
                "top": min_t,
                "width": max_r - min_l,
                "height": max_b - min_t,
            }

    # Try 3: Character-concatenation sliding window
    for start_idx in range(w_count):
        curr_text = ""
        span = []
        for end_idx in range(start_idx, min(start_idx + 8, w_count)):
            box = word_boxes[end_idx]
            clean_part = re.sub(r"[^\w]", "", box["text"]).lower()
            curr_text += clean_part
            span.append(box)

            if clean_target in curr_text or curr_text in clean_target:
                if len(curr_text) >= min(4, len(clean_target)):
                    min_l = min(w["left"] for w in span)
                    min_t = min(w["top"] for w in span)
                    max_r = max(w["left"] + w["width"] for w in span)
                    max_b = max(w["top"] + w["height"] for w in span)
                    return {
                        "left": min_l,
                        "top": min_t,
                        "width": max_r - min_l,
                        "height": max_b - min_t,
                    }

    return None

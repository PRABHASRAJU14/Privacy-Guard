"""Deterministic validation routines for high-confidence PII identification.
Implements Verhoeff, Luhn, and structural validation algorithms.
"""
import re
from typing import Tuple

# ---------------------------------------------------------------------------
# Verhoeff Algorithm Tables for Aadhaar Validation
# ---------------------------------------------------------------------------
_VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

_VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]


def validate_verhoeff(num_str: str) -> bool:
    """Validate a numeric string using the Verhoeff checksum algorithm."""
    digits = re.sub(r"\D", "", num_str)
    if not digits:
        return False
    c = 0
    for i, item in enumerate(reversed(digits)):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][int(item)]]
    return c == 0


def validate_aadhaar(value: str) -> Tuple[bool, float]:
    """Validate an Indian Aadhaar number.
    Returns (is_valid, confidence).
    """
    cleaned = re.sub(r"\s+", "", value)
    if not re.fullmatch(r"\d{12}", cleaned):
        return False, 0.0

    # Aadhaar cannot start with 0 or 1
    valid_start = cleaned[0] not in ("0", "1")
    verhoeff_pass = validate_verhoeff(cleaned)

    if verhoeff_pass and valid_start:
        return True, 0.98
    if verhoeff_pass:
        return True, 0.92
    # Structural match (e.g. formatted 4-4-4 in context), but test/dummy checksum
    return False, 0.85


def validate_luhn(card_number: str) -> bool:
    """Validate a card number using Luhn algorithm (mod 10)."""
    digits = re.sub(r"\D", "", card_number)
    if not (13 <= len(digits) <= 19):
        return False

    total = 0
    reverse_digits = digits[::-1]
    for i, ch in enumerate(reverse_digits):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def validate_card(value: str) -> Tuple[bool, float]:
    """Validate payment card number using Luhn and length rules."""
    cleaned = re.sub(r"[\s-]", "", value)
    if not (13 <= len(cleaned) <= 19 and cleaned.isdigit()):
        return False, 0.0

    is_luhn = validate_luhn(cleaned)
    if is_luhn:
        return True, 0.98
    # Formatted 4x4 card string but invalid checksum (or test card)
    if len(cleaned) == 16:
        return False, 0.80
    return False, 0.60


# Valid entity codes for 4th character of Indian PAN
PAN_ENTITY_TYPES = {"A", "B", "C", "F", "G", "H", "J", "L", "P", "T"}


def validate_pan(value: str) -> Tuple[bool, float]:
    """Validate Indian Permanent Account Number (PAN)."""
    cleaned = value.strip().upper()
    if not re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", cleaned):
        return False, 0.0

    entity_code = cleaned[3]
    if entity_code in PAN_ENTITY_TYPES:
        return True, 0.98
    # Matches structure [A-Z]{5}[0-9]{4}[A-Z], rare or custom entity
    return True, 0.90


def validate_ifsc(value: str) -> Tuple[bool, float]:
    """Validate Indian Financial System Code (IFSC).
    Format: 4 alphabets, 5th character strictly '0', 6 alphanumeric characters.
    """
    cleaned = value.strip().upper()
    if re.fullmatch(r"^[A-Z]{4}0[A-Z0-9]{6}$", cleaned):
        return True, 0.98
    return False, 0.0


# Known common email TLDs to avoid misidentifying emails as UPI IDs
COMMON_EMAIL_TLDS = {
    "com", "org", "net", "edu", "gov", "mil", "io", "ai", "co", "in",
    "co.in", "ac.in", "gov.in", "info", "biz", "me", "online", "app"
}

# Known common Indian UPI PSP handles
COMMON_UPI_HANDLES = {
    "bank", "upi", "okhdfcbank", "oksbi", "okaxis", "okicici", "paytm",
    "ybl", "axl", "ibl", "apl", "ptaxis", "ptsbi", "pthdfc", "fbl",
    "barodampay", "mahb", "idfcbank", "waaxis", "wahdfc", "wasbi", "waicici"
}


def validate_upi(value: str) -> Tuple[bool, float]:
    """Validate UPI VPA (Virtual Payment Address).
    Format: username@handle (e.g. rahul@bank, store@okhdfcbank).
    """
    cleaned = value.strip().lower()
    if "@" not in cleaned:
        return False, 0.0

    parts = cleaned.split("@")
    if len(parts) != 2:
        return False, 0.0

    username, handle = parts[0], parts[1]
    if not (1 <= len(username) <= 64 and 2 <= len(handle) <= 32):
        return False, 0.0

    # Ensure valid characters
    if not re.fullmatch(r"[a-z0-9.\-_]+", username):
        return False, 0.0
    if not re.fullmatch(r"[a-z0-9.\-_]+", handle):
        return False, 0.0

    # Disambiguate against standard emails
    if "." in handle:
        tld = handle.split(".")[-1]
        if tld in COMMON_EMAIL_TLDS and handle not in COMMON_UPI_HANDLES:
            return False, 0.0

    if handle in COMMON_UPI_HANDLES:
        return True, 0.98
    # No dot in handle typically means UPI handle like @bank, @paytm, etc.
    if "." not in handle:
        return True, 0.92
    return True, 0.75


def validate_indian_phone(value: str) -> Tuple[bool, float]:
    """Validate 10-digit Indian mobile number with optional +91 or 0 prefix."""
    cleaned = re.sub(r"[\s\-\(\)]", "", value)
    # Strip +91 or 91 or 0
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]

    if len(cleaned) == 10 and cleaned.isdigit() and cleaned[0] in "6789":
        return True, 0.95
    return False, 0.0


def validate_email(value: str) -> Tuple[bool, float]:
    """Validate standard email address."""
    cleaned = value.strip().lower()
    pattern = r"^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
    if re.fullmatch(pattern, cleaned):
        return True, 0.95
    return False, 0.0

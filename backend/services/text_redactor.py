"""Deterministic Text Redactor for PrivacyGuard.
Applies context-specific and format-preserving masking to sensitive PII entities.
"""
import re
from typing import List, Dict, Tuple
from backend.schemas.scan import DetectedPIIItem


def mask_email(value: str) -> str:
    """Mask email: r••••@example.com"""
    if "@" not in value:
        return "••••••••"
    parts = value.split("@")
    username, domain = parts[0], parts[1]
    first_char = username[0] if username else "u"
    return f"{first_char}••••@{domain}"


def mask_phone(value: str) -> str:
    """Mask phone: ••••••••10 (preserves last 2 digits)."""
    digits = re.sub(r"\D", "", value)
    if len(digits) >= 2:
        last2 = digits[-2:]
        return f"••••••••{last2}"
    return "••••••••••"


def mask_aadhaar(value: str) -> str:
    """Mask Aadhaar: •••• •••• 9012 (preserves last 4 digits)."""
    digits = re.sub(r"\D", "", value)
    if len(digits) >= 4:
        last4 = digits[-4:]
        if " " in value or "-" in value:
            return f"•••• •••• {last4}"
        return f"••••••••{last4}"
    return "•••• •••• ••••"


def mask_pan(value: str) -> str:
    """Mask PAN: •••••••••• (fully masked)."""
    return "••••••••••"


def mask_bank_account(value: str) -> str:
    """Mask bank account: ••••••••7712 (preserves last 4 digits)."""
    digits = re.sub(r"\D", "", value)
    if len(digits) >= 4:
        last4 = digits[-4:]
        return f"••••••••{last4}"
    return "••••••••••••"


def mask_upi(value: str) -> str:
    """Mask UPI: ••••••••@bank."""
    if "@" in value:
        handle = value.split("@")[-1]
        return f"••••••••@{handle}"
    return "••••••••@bank"


def mask_card(value: str) -> str:
    """Mask card: •••• •••• •••• 1111 (preserves last 4 digits)."""
    digits = re.sub(r"\D", "", value)
    if len(digits) >= 4:
        last4 = digits[-4:]
        if " " in value or "-" in value:
            return f"•••• •••• •••• {last4}"
        return f"••••••••••••{last4}"
    return "•••• •••• •••• ••••"


def mask_ifsc(value: str) -> str:
    """Mask IFSC: •••••••••••."""
    return "•••••••••••"


def mask_balance(value: str) -> str:
    """Mask balance value: ₹•••••• / INR ••••••."""
    clean = value.strip()
    curr_match = re.match(r"^(?:INR|USD|EUR|GBP|Rs\.?|[₹$€£])\s*", clean, re.IGNORECASE)
    if curr_match:
        prefix = curr_match.group()
        return f"{prefix}••••••"
    return "₹••••••"


def mask_unrelated_transactions(value: str) -> str:
    """Mask unrelated transaction list."""
    lines = value.split("\n")
    masked_lines = [re.sub(r"[^\s]", "•", line) for line in lines]
    return "\n".join(masked_lines)


def get_mask_for_item(item_type: str, raw_value: str) -> str:
    """Route item to appropriate masking routine based on type."""
    t = item_type.lower()
    if t == "email":
        return mask_email(raw_value)
    if t == "phone":
        return mask_phone(raw_value)
    if t == "aadhaar":
        return mask_aadhaar(raw_value)
    if t == "pan":
        return mask_pan(raw_value)
    if t == "bank_account":
        return mask_bank_account(raw_value)
    if t == "upi":
        return mask_upi(raw_value)
    if t == "card":
        return mask_card(raw_value)
    if t == "ifsc":
        return mask_ifsc(raw_value)
    if t == "balance":
        return mask_balance(raw_value)
    if t == "unrelated_transactions":
        return mask_unrelated_transactions(raw_value)
    return "••••••••"


def redact_text(
    original_text: str,
    detected_items: List[DetectedPIIItem],
    decisions: Dict[str, str],
) -> Tuple[str, int, int]:
    """Redact sensitive PII items in text based on user or purpose decisions.
    Processes items from end of text backwards to preserve string character offsets.
    Returns (redacted_text, protected_count, kept_count).
    """
    if not original_text or not detected_items:
        return original_text, 0, 0

    # Sort items by start offset descending (reverse order)
    # This prevents replacement length differences from offsetting earlier spans
    sorted_items = sorted(detected_items, key=lambda x: x.start, reverse=True)

    text_chars = list(original_text)
    protected_count = 0
    kept_count = 0

    for item in sorted_items:
        # Determine decision: decisions map can key by type, label, or exact value
        decision = decisions.get(
            item.type.lower(),
            decisions.get(
                item.label.lower(),
                decisions.get(item.value, "PROTECT"),
            ),
        )
        decision = decision.upper().strip()

        if decision == "KEEP":
            kept_count += 1
            continue

        # Otherwise decision is PROTECT
        protected_count += 1
        masked_val = get_mask_for_item(item.type, item.value)

        # Slice replacement
        start = item.start
        end = item.end
        if 0 <= start <= end <= len(text_chars):
            text_chars[start:end] = list(masked_val)

    protected_text = "".join(text_chars)
    return protected_text, protected_count, kept_count

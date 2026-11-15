"""Deterministic PII Detector for PrivacyGuard.
Extracts Aadhaar, PAN, Phone, Email, Cards, Bank Accounts, UPI, and IFSC codes.
Uses regex, context heuristics, and deterministic validation.
"""
import re
from typing import List, Dict, Any, Optional
from backend.schemas.scan import DetectedPIIItem
from backend.services.validator import (
    validate_aadhaar,
    validate_card,
    validate_pan,
    validate_ifsc,
    validate_upi,
    validate_indian_phone,
    validate_email,
)
from backend.services.risk_engine import get_category, get_severity, get_risk_weight

# Counter-indicators that specify a number is NOT a bank account
NON_BANK_CONTEXT_WORDS = [
    "order", "invoice", "tracking", "bill no", "receipt no", "item id",
    "product id", "pnr", "ref no", "reference", "ticket", "voucher", "sku"
]

# Contextual indicators that indicate a bank account number
BANK_CONTEXT_WORDS = [
    "bank account", "account number", "account no", "acc no", "a/c no",
    "a/c", "bank a/c", "acct no", "savings account", "current account",
    "salary account", "beneficiary account", "account"
]


def detect_pii(text: str) -> List[DetectedPIIItem]:
    """Scan text and return detected PII entities with offsets, validation, and risk weights.
    Does NOT log or persist raw values.
    """
    if not text or not text.strip():
        return []

    candidates: List[Dict[str, Any]] = []

    # -----------------------------------------------------------------------
    # 1. EMAIL
    # -----------------------------------------------------------------------
    email_pattern = re.compile(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
    )
    for match in email_pattern.finditer(text):
        val = match.group()
        valid, conf = validate_email(val)
        if valid:
            candidates.append({
                "type": "email",
                "label": "Email Address",
                "value": val,
                "start": match.start(),
                "end": match.end(),
                "confidence": conf,
                "valid": valid,
                "explanation": "Direct contact identifier subject to phishing and spam exposure.",
            })

    # -----------------------------------------------------------------------
    # 2. UPI ID
    # -----------------------------------------------------------------------
    upi_pattern = re.compile(
        r"\b[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9.\-_]{2,32}\b"
    )
    for match in upi_pattern.finditer(text):
        val = match.group()
        # Avoid overriding matched emails
        if any(c["type"] == "email" and c["start"] == match.start() for c in candidates):
            continue
        valid, conf = validate_upi(val)
        if valid:
            candidates.append({
                "type": "upi",
                "label": "UPI ID",
                "value": val,
                "start": match.start(),
                "end": match.end(),
                "confidence": conf,
                "valid": valid,
                "explanation": "Financial payment handle linked directly to bank account.",
            })

    # -----------------------------------------------------------------------
    # 3. IFSC CODE
    # -----------------------------------------------------------------------
    ifsc_pattern = re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b")
    for match in ifsc_pattern.finditer(text):
        val = match.group()
        valid, conf = validate_ifsc(val)
        if valid:
            candidates.append({
                "type": "ifsc",
                "label": "IFSC Code",
                "value": val,
                "start": match.start(),
                "end": match.end(),
                "confidence": conf,
                "valid": valid,
                "explanation": "Identifies specific bank branch and routing.",
            })

    # -----------------------------------------------------------------------
    # 4. PAN CARD
    # -----------------------------------------------------------------------
    pan_pattern = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
    for match in pan_pattern.finditer(text):
        val = match.group()
        valid, conf = validate_pan(val)
        if valid:
            candidates.append({
                "type": "pan",
                "label": "PAN Card",
                "value": val,
                "start": match.start(),
                "end": match.end(),
                "confidence": conf,
                "valid": valid,
                "explanation": "National tax identifier; primary vector for financial identity fraud.",
            })

    # -----------------------------------------------------------------------
    # 5. INDIAN PHONE NUMBER
    # -----------------------------------------------------------------------
    phone_pattern = re.compile(
        r"(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b"
    )
    for match in phone_pattern.finditer(text):
        val = match.group()
        valid, conf = validate_indian_phone(val)
        if valid:
            candidates.append({
                "type": "phone",
                "label": "Phone Number",
                "value": val,
                "start": match.start(),
                "end": match.end(),
                "confidence": conf,
                "valid": valid,
                "explanation": "Personal phone number vulnerable to SIM swap and unwanted calls.",
            })

    # -----------------------------------------------------------------------
    # 6. CREDIT / DEBIT CARD
    # -----------------------------------------------------------------------
    card_pattern = re.compile(
        r"\b(?:\d{4}[-\s]){3}\d{4}\b|\b\d{15,16}\b"
    )
    for match in card_pattern.finditer(text):
        val = match.group()
        valid, conf = validate_card(val)
        # We check cards before Aadhaar, but if it has 12 digits (4-4-4) it's likely Aadhaar
        cleaned_digits = re.sub(r"\D", "", val)
        if len(cleaned_digits) != 12:
            candidates.append({
                "type": "card",
                "label": "Credit / Debit Card",
                "value": val,
                "start": match.start(),
                "end": match.end(),
                "confidence": conf,
                "valid": valid,
                "explanation": "Payment card number; extreme risk of unauthorized financial transactions.",
            })

    # -----------------------------------------------------------------------
    # 7. AADHAAR NUMBER
    # -----------------------------------------------------------------------
    # Format: 4 digits, space/hyphen, 4 digits, space/hyphen, 4 digits (or 12 digits with Aadhaar context)
    aadhaar_pattern = re.compile(r"\b\d{4}[\s-]\d{4}[\s-]\d{4}\b")
    for match in aadhaar_pattern.finditer(text):
        val = match.group()
        # Check context before/after
        start_ctx = max(0, match.start() - 25)
        prefix_ctx = text[start_ctx:match.start()].lower()
        if "card" in prefix_ctx or "visa" in prefix_ctx or "mastercard" in prefix_ctx:
            continue

        valid, conf = validate_aadhaar(val)
        candidates.append({
            "type": "aadhaar",
            "label": "Aadhaar Number",
            "value": val,
            "start": match.start(),
            "end": match.end(),
            "confidence": conf,
            "valid": valid,
            "explanation": "Indian national universal biometric ID; high risk of identity theft.",
        })

    # -----------------------------------------------------------------------
    # 8. BANK ACCOUNT (Context-Aware)
    # -----------------------------------------------------------------------
    # Pattern A: Explicit contextual match like "Bank Account: 4821 0098 7712" or "A/c: 123456789012"
    bank_ctx_pattern = re.compile(
        r"(?i)(?:bank\s*(?:a(?:/|c)?c(?:ount)?|account)|account\s*(?:no\.?|number|#)?|a/c\s*(?:no\.?|#)?|acc(?:\.|\s)*no\.?|savings\s*a/c|current\s*a/c)\s*(?:is|:|-)?\s*[:\s]*"
        r"((?:\d[\s-]?){8,17}\d)\b"
    )
    for match in bank_ctx_pattern.finditer(text):
        val = match.group(1).strip()
        cleaned_digits = re.sub(r"\D", "", val)
        if 9 <= len(cleaned_digits) <= 18:
            val_start = match.start(1)
            val_end = match.end(1)
            candidates.append({
                "type": "bank_account",
                "label": "Bank Account",
                "value": val,
                "start": val_start,
                "end": val_end,
                "confidence": 0.95,
                "valid": True,
                "explanation": "Bank account number; exposes financial holdings and routing.",
            })

    # Pattern B: 9-18 digit continuous or spaced numbers examined with a surrounding text window
    digit_seq_pattern = re.compile(r"\b\d{9,18}\b")
    for match in digit_seq_pattern.finditer(text):
        val = match.group()
        # Skip if already captured by Card, Aadhaar, Phone, or Bank Account
        if any(c["start"] <= match.start() and c["end"] >= match.end() for c in candidates):
            continue

        # Inspect window of ±60 characters
        win_start = max(0, match.start() - 60)
        win_end = min(len(text), match.end() + 60)
        window = text[win_start:win_end].lower()

        # Reject if counter-indicators present (e.g. Order ID, Invoice, Tracking)
        if any(neg in window for neg in NON_BANK_CONTEXT_WORDS):
            continue

        # Only accept as bank account if positive bank indicator is in the local window
        if any(pos in window for pos in BANK_CONTEXT_WORDS):
            candidates.append({
                "type": "bank_account",
                "label": "Bank Account",
                "value": val,
                "start": match.start(),
                "end": match.end(),
                "confidence": 0.90,
                "valid": True,
                "explanation": "Bank account number identified through financial context.",
            })

    # -----------------------------------------------------------------------
    # 9. AVAILABLE BALANCE
    # -----------------------------------------------------------------------
    balance_pattern = re.compile(
        r"(?i)(?:available\s*balance|account\s*balance|balance)\s*(?:is|:|-)?\s*([^\n\r]+?)(?=\n|$)"
    )
    for match in balance_pattern.finditer(text):
        val = match.group(1).strip()
        if val:
            candidates.append({
                "type": "balance",
                "label": "Available Balance",
                "value": val,
                "start": match.start(1),
                "end": match.end(1),
                "confidence": 0.95,
                "valid": True,
                "explanation": "Reveals account financial liquidity and net worth.",
            })

    # -----------------------------------------------------------------------
    # 10. MERCHANT / PAID TO (Expense proof context)
    # -----------------------------------------------------------------------
    merchant_pattern = re.compile(
        r"(?i)(?:merchant|paid\s*to|payee|vendor|trip\s*invoice|service\s*provider)\s*(?:is|:|-)?\s*([A-Za-z0-9\s&.\-]+?)(?=\n|$|,|\.)"
    )
    for match in merchant_pattern.finditer(text):
        val = match.group(1).strip()
        if val:
            candidates.append({
                "type": "merchant",
                "label": "Merchant",
                "value": val,
                "start": match.start(1),
                "end": match.end(1),
                "confidence": 0.95,
                "valid": True,
                "explanation": "Merchant or payee proving the target transaction.",
            })

    # -----------------------------------------------------------------------
    # 11. TRANSACTION AMOUNT
    # -----------------------------------------------------------------------
    amount_pattern = re.compile(
        r"(?i)(?:total\s*amount|paid\s*amount|amount|amt)\s*(?:is|:|-)?\s*([^\n\r]+?)(?=\n|$)"
    )
    for match in amount_pattern.finditer(text):
        val = match.group(1).strip()
        if val:
            candidates.append({
                "type": "amount",
                "label": "Amount",
                "value": val,
                "start": match.start(1),
                "end": match.end(1),
                "confidence": 0.95,
                "valid": True,
                "explanation": "Transaction payment sum proving expenditure.",
            })

    # -----------------------------------------------------------------------
    # 12. TRANSACTION DATE
    # -----------------------------------------------------------------------
    date_pattern = re.compile(
        r"(?i)(?:transaction\s*date|payment\s*date|date)\s*(?:is|:|-)?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b"
    )
    for match in date_pattern.finditer(text):
        val = match.group(1).strip()
        candidates.append({
            "type": "transaction_date",
            "label": "Transaction Date",
            "value": val,
            "start": match.start(1),
            "end": match.end(1),
            "confidence": 0.95,
            "valid": True,
            "explanation": "Timestamp validating when the transaction occurred.",
        })

    # -----------------------------------------------------------------------
    # 13. TRANSACTION ID
    # -----------------------------------------------------------------------
    txnid_pattern = re.compile(
        r"(?i)(?:transaction\s*id|txn\s*id|ref\s*no|reference\s*id|utr\s*no|utr)\s*(?:is|:|-)?\s*([A-Za-z0-9\-]{6,32})\b"
    )
    for match in txnid_pattern.finditer(text):
        val = match.group(1).strip()
        candidates.append({
            "type": "transaction_id",
            "label": "Transaction ID",
            "value": val,
            "start": match.start(1),
            "end": match.end(1),
            "confidence": 0.95,
            "valid": True,
            "explanation": "Official reference identifier confirming transaction settlement.",
        })

    # -----------------------------------------------------------------------
    # 14. OTHER / UNRELATED TRANSACTIONS
    # -----------------------------------------------------------------------
    other_txns_pattern = re.compile(
        r"(?i)(?:other\s*transactions|recent\s*transactions|recent\s*activity|recent\s*spends|recent)[\s:]*([^\n\r]+?)(?=\n\s*\n|$)"
    )
    for match in other_txns_pattern.finditer(text):
        val = match.group(1).strip()
        if val:
            candidates.append({
                "type": "unrelated_transactions",
                "label": "Other Transactions",
                "value": val,
                "start": match.start(1),
                "end": match.end(1),
                "confidence": 0.95,
                "valid": True,
                "explanation": "Unrelated financial expenses outside the scope of current proof.",
            })

    # -----------------------------------------------------------------------
    # Overlap Resolution
    # -----------------------------------------------------------------------
    # Sort candidates by start ascending, then length descending, then confidence descending
    candidates.sort(
        key=lambda c: (c["start"], -(c["end"] - c["start"]), -c["confidence"])
    )

    resolved: List[DetectedPIIItem] = []
    occupied_spans: List[tuple] = []

    for c in candidates:
        c_start, c_end = c["start"], c["end"]
        # Check if overlaps with an already chosen candidate
        overlaps = False
        for o_start, o_end in occupied_spans:
            if max(c_start, o_start) < min(c_end, o_end):
                overlaps = True
                break

        if not overlaps:
            occupied_spans.append((c_start, c_end))
            resolved.append(
                DetectedPIIItem(
                    type=c["type"],
                    label=c["label"],
                    category=get_category(c["type"]),
                    value=c["value"],
                    start=c["start"],
                    end=c["end"],
                    severity=get_severity(c["type"]),
                    risk_weight=get_risk_weight(c["type"]),
                    confidence=round(c["confidence"], 2),
                    valid=c["valid"],
                    explanation=c.get("explanation"),
                )
            )

    # Sort final result by appearance order in text
    resolved.sort(key=lambda x: x.start)
    return resolved

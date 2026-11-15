"""Deterministic Risk Engine for PrivacyGuard.
Calculates risk scores, levels, and combination penalties.
"""
from typing import List
from backend.schemas.scan import DetectedPIIItem, RiskInfo

# Base risk weights per PII type
PII_RISK_WEIGHTS = {
    "aadhaar": 30,
    "card": 35,
    "bank_account": 30,
    "pan": 25,
    "upi": 20,
    "balance": 20,
    "unrelated_transactions": 20,
    "ifsc": 15,
    "phone": 15,
    "full_address": 15,
    "email": 10,
    "transaction_id": 10,
    "name": 10,
    "amount": 5,
    "merchant": 5,
    "transaction_date": 5,
}

# Category mappings
CATEGORY_MAP = {
    "aadhaar": "Identity",
    "pan": "Identity",
    "name": "Identity",
    "full_address": "Identity",
    "bank_account": "Financial",
    "card": "Financial",
    "upi": "Financial",
    "balance": "Financial",
    "unrelated_transactions": "Financial",
    "amount": "Financial",
    "ifsc": "Financial",
    "phone": "Contact",
    "email": "Contact",
    "transaction_id": "Transaction",
    "merchant": "Transaction",
    "transaction_date": "Transaction",
}

# Severity mappings
SEVERITY_MAP = {
    "aadhaar": "CRITICAL",
    "card": "CRITICAL",
    "bank_account": "CRITICAL",
    "pan": "HIGH",
    "upi": "HIGH",
    "phone": "HIGH",
    "balance": "HIGH",
    "unrelated_transactions": "HIGH",
    "ifsc": "MEDIUM",
    "email": "MEDIUM",
    "full_address": "MEDIUM",
    "transaction_id": "MEDIUM",
    "name": "LOW",
    "amount": "LOW",
    "merchant": "LOW",
    "transaction_date": "LOW",
}


def get_risk_weight(pii_type: str) -> int:
    """Retrieve base risk weight for a given PII type."""
    return PII_RISK_WEIGHTS.get(pii_type.lower(), 10)


def get_category(pii_type: str) -> str:
    """Retrieve category for a given PII type."""
    return CATEGORY_MAP.get(pii_type.lower(), "Other")


def get_severity(pii_type: str) -> str:
    """Retrieve severity classification for a given PII type."""
    return SEVERITY_MAP.get(pii_type.lower(), "MEDIUM")


def calculate_risk(detected_items: List[DetectedPIIItem]) -> RiskInfo:
    """Calculate the comprehensive risk score and risk level for detected items.
    Applies combination penalty when identity and contact/financial info coexist.
    """
    if not detected_items:
        return RiskInfo(
            score=0,
            level="SAFE",
            critical_count=0,
            high_count=0,
            medium_count=0,
            low_count=0,
            has_identity=False,
            has_contact=False,
            has_financial=False,
            combination_risk_applied=False,
        )

    # Unique items by type and value to avoid artificial score inflation from duplicates
    unique_items = []
    seen = set()
    for item in detected_items:
        key = (item.type, item.value.strip().lower())
        if key not in seen:
            seen.add(key)
            unique_items.append(item)

    raw_score = sum(item.risk_weight for item in unique_items)

    # Categorical breakdown
    has_identity = any(item.category == "Identity" for item in unique_items)
    has_contact = any(item.category == "Contact" for item in unique_items)
    has_financial = any(item.category == "Financial" for item in unique_items)

    combination_applied = False
    combo_penalty = 0

    # Combination penalty rules:
    # 1. Identity + Contact + Financial together = severe risk (+25)
    # 2. Identity + Financial together = +20
    # 3. Identity + Contact together = +15
    # 4. Financial + Contact together = +10
    if has_identity and has_contact and has_financial:
        combo_penalty = 25
        combination_applied = True
    elif has_identity and has_financial:
        combo_penalty = 20
        combination_applied = True
    elif has_identity and has_contact:
        combo_penalty = 15
        combination_applied = True
    elif has_financial and has_contact:
        combo_penalty = 10
        combination_applied = True

    total_score = min(100, raw_score + combo_penalty)

    # Severity counters
    critical_count = sum(1 for item in unique_items if item.severity == "CRITICAL")
    high_count = sum(1 for item in unique_items if item.severity == "HIGH")
    medium_count = sum(1 for item in unique_items if item.severity == "MEDIUM")
    low_count = sum(1 for item in unique_items if item.severity == "LOW")

    # Levels: 0 = SAFE, 1-29 = LOW, 30-59 = MEDIUM, 60-100 = HIGH
    if total_score == 0:
        level = "SAFE"
    elif total_score <= 29:
        level = "LOW"
    elif total_score <= 59:
        level = "MEDIUM"
    else:
        level = "HIGH"

    return RiskInfo(
        score=total_score,
        level=level,
        critical_count=critical_count,
        high_count=high_count,
        medium_count=medium_count,
        low_count=low_count,
        has_identity=has_identity,
        has_contact=has_contact,
        has_financial=has_financial,
        combination_risk_applied=combination_applied,
    )

"""Python Unit & Integration Test Suite for PrivacyGuard Backend."""
import sys
from pathlib import Path
import re

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
from backend.services.validator import (
    validate_verhoeff,
    validate_aadhaar,
    validate_card,
    validate_pan,
    validate_upi,
    validate_indian_phone,
    validate_email,
)
from backend.services.purpose_engine import analyze_purpose
from backend.services.risk_engine import calculate_risk
from backend.services.text_redactor import redact_text


def test_verhoeff_valid_and_invalid():
    assert validate_verhoeff("456789123451") is True
    assert validate_verhoeff("456789123452") is False


def test_pan_card_validation():
    valid, conf = validate_pan("ABCDE1234F")
    assert valid is True
    assert conf >= 0.90

    invalid, _ = validate_pan("12345ABCDE")
    assert invalid is False


def test_card_luhn_validation():
    valid, conf = validate_card("4532015112830366")
    assert valid is True

    invalid, _ = validate_card("4532015112830367")
    assert invalid is False


def test_upi_validation():
    valid, conf = validate_upi("rahul@okhdfcbank")
    assert valid is True


def test_purpose_minimization_expense_claim():
    sample_entities = [
        {"type": "amount", "value": "₹2,850"},
        {"type": "bank_account", "value": "482100987712"},
        {"type": "upi", "value": "rahul@okaxis"},
    ]
    resp = analyze_purpose("expense_reimbursement", sample_entities)
    decisions = {r.type: r.decision for r in resp.recommendations}
    assert decisions["amount"] == "KEEP"
    assert decisions["bank_account"] == "PROTECT"
    assert decisions["upi"] == "PROTECT"


def test_text_redaction_and_receipt():
    raw_text = "Paid ₹2850 from account 482100987712"
    detected = [
        {"type": "bank_account", "value": "482100987712", "start": 24, "end": 36}
    ]
    decisions = {"bank_account": "PROTECT"}
    redacted, count_p, count_k = redact_text(raw_text, detected, decisions)
    assert ("••••" in redacted or "[REDACTED" in redacted)
    assert "482100987712" not in redacted
    assert count_p == 1


if __name__ == "__main__":
    test_verhoeff_valid_and_invalid()
    test_pan_card_validation()
    test_card_luhn_validation()
    test_upi_validation()
    test_purpose_minimization_expense_claim()
    test_text_redaction_and_receipt()
    print("✅ All Python backend unit tests passed successfully!")


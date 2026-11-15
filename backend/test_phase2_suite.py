"""Phase 2 Verification Test Suite.
Covers Purpose-Aware Minimization, Text Redaction, and Explainability.
"""
import sys
import unittest
from fastapi.testclient import TestClient

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from backend.main import app
from backend.services.purpose_engine import (
    analyze_purpose,
    PURPOSE_POLICIES,
    PURPOSE_ALIASES,
)
from backend.services.text_redactor import (
    redact_text,
    mask_email,
    mask_phone,
    mask_aadhaar,
    mask_pan,
    mask_card,
    mask_bank_account,
    mask_upi,
    mask_ifsc,
    mask_balance,
)

client = TestClient(app)

SAMPLE_EXPENSE = """Trip Invoice: Uber India
Date: 12-05-2024
Total Amount: INR 450.00
Transaction ID: TXN987654321
Bank Account: 123456789012
UPI ID: john.doe@okaxis
Account Balance: INR 125000.00
Recent: Swiggy INR 820.00"""


class TestPhase2Backend(unittest.TestCase):

    def test_01_health(self):
        resp = client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")

    def test_02_text_redactor_masks(self):
        self.assertEqual(mask_email("john.doe@example.com"), "j••••@example.com")
        self.assertEqual(mask_phone("9876543210"), "••••••••10")
        self.assertEqual(mask_aadhaar("1234 5678 9012"), "•••• •••• 9012")
        self.assertEqual(mask_pan("ABCDE1234F"), "••••••••••")
        self.assertEqual(mask_card("4111 1111 1111 1111"), "•••• •••• •••• 1111")
        self.assertEqual(mask_bank_account("123456789012"), "••••••••9012")
        self.assertEqual(mask_upi("john.doe@okaxis"), "••••••••@okaxis")
        self.assertEqual(mask_ifsc("HDFC0001234"), "•••••••••••")
        self.assertEqual(mask_balance("INR 125000.00"), "INR ••••••")
        self.assertEqual(mask_balance("₹125000.00"), "₹••••••")

    def test_03_scan_expense_text(self):
        resp = client.post("/api/scan/text", json={"text": SAMPLE_EXPENSE})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertGreater(data["risk"]["score"], 50)
        self.assertEqual(data["risk"]["level"], "HIGH")
        types = [e["type"] for e in data["detected"]]
        # Must detect sensitive financial items
        self.assertIn("bank_account", types)
        self.assertIn("upi", types)
        self.assertIn("balance", types)
        self.assertIn("amount", types)
        self.assertIn("transaction_date", types)
        self.assertIn("transaction_id", types)

    def test_04_purpose_analyze_expense(self):
        # 1. First scan
        scan_resp = client.post("/api/scan/text", json={"text": SAMPLE_EXPENSE}).json()
        detected = scan_resp["detected"]

        # 2. Analyze purpose
        resp = client.post("/api/analyze/purpose", json={
            "purpose": "expense_reimbursement",
            "detected": detected
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["purpose"], "expense_reimbursement")
        self.assertEqual(data["purpose_label"], "Expense Reimbursement")

        keep_types = [r["type"] for r in data["recommendations"] if r["decision"] == "KEEP"]
        protect_types = [r["type"] for r in data["recommendations"] if r["decision"] == "PROTECT"]

        # Necessary for expense proof: amount, date, transaction_id, merchant
        for expected_keep in ["amount", "transaction_date", "transaction_id"]:
            if expected_keep in [d["type"] for d in detected]:
                self.assertIn(expected_keep, keep_types)

        # Must be protected: bank_account, upi, balance
        for expected_protect in ["bank_account", "upi", "balance"]:
            if expected_protect in [d["type"] for d in detected]:
                self.assertIn(expected_protect, protect_types)

        # Verify explainability reasons exist for every recommendation
        for r in data["recommendations"]:
            self.assertTrue(len(r["reason"]) > 10, f"Missing or short reason for {r['type']}")

    def test_05_protect_text_expense(self):
        # 1. First scan
        scan_resp = client.post("/api/scan/text", json={"text": SAMPLE_EXPENSE}).json()
        detected = scan_resp["detected"]

        # 2. Purpose analyze
        purp_resp = client.post("/api/analyze/purpose", json={
            "purpose": "expense_reimbursement",
            "detected": detected
        }).json()

        decisions = {r["type"]: r["decision"] for r in purp_resp["recommendations"]}

        # 3. Protect text
        resp = client.post("/api/protect/text", json={
            "text": SAMPLE_EXPENSE,
            "detected": detected,
            "decisions": decisions
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["safe_to_share"])
        self.assertGreater(data["protected_count"], 0)
        self.assertGreater(data["kept_count"], 0)

        protected_text = data["protected_text"]
        # Protected items must NOT appear in protected_text in raw form
        self.assertNotIn("123456789012", protected_text)
        self.assertNotIn("john.doe@okaxis", protected_text)
        # Kept items MUST appear
        self.assertIn("INR 450.00", protected_text)
        self.assertIn("12-05-2024", protected_text)
        self.assertIn("TXN987654321", protected_text)

    def test_06_all_10_purposes(self):
        scan_resp = client.post("/api/scan/text", json={"text": SAMPLE_EXPENSE}).json()
        detected = scan_resp["detected"]

        all_purposes = [
            "expense_reimbursement", "bank_verification", "job_application",
            "age_verification", "address_verification", "college_admission",
            "general_sharing", "public_post", "loan_application", "custom"
        ]
        for p in all_purposes:
            resp = client.post("/api/analyze/purpose", json={
                "purpose": p,
                "detected": detected
            })
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["total_keep"] + data["total_protect"], len(data["recommendations"]))


if __name__ == "__main__":
    unittest.main()

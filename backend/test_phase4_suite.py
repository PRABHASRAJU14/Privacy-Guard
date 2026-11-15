"""Phase 4 Automated Test Suite for PrivacyGuard.
Tests:
1. Database initialization and table creation
2. Scan history creation with safe metadata
3. Protection history creation/update with SHA-256 receipt
4. Privacy-first rule verification: inspect SQLite directly for sensitive test strings
5. GET /api/history returns valid metadata list
6. GET /api/history?limit=X validation (rejects invalid, clamps/returns limit)
7. GET /api/stats calculation of all metrics
8. Deterministic leaks_averted definition validation
9. Risk before, risk after, and exposure reduction calculations
10. Multiple scans tracking
11. Multiple file types tracking (text, image, pdf)
12. Empty database graceful response
13. Audit events lifecycle logging
14. End-to-end full protection lifecycle with receipt verification
"""
import os
import unittest
import sqlite3
import hashlib
from fastapi.testclient import TestClient

# Set up test database environment BEFORE importing database/main modules
TEST_DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "test_privacyguard.db"
)
os.environ["PRIVACYGUARD_DB_PATH"] = TEST_DB_PATH

from backend.main import app
from backend.database.database import init_db, get_db_connection
from backend.database.models import (
    create_scan_record,
    update_scan_protection,
    record_audit_event,
    get_history,
    get_privacy_stats,
)


class TestPhase4Suite(unittest.TestCase):
    """Phase 4 Test Suite: SQLite, Audit Trail, Privacy Metrics & SHA-256 Receipts."""

    @classmethod
    def setUpClass(cls):
        """Clean and initialize the test database."""
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except Exception:
                pass
        init_db(TEST_DB_PATH)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        """Clean up the test database after suite execution."""
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except Exception:
                pass

    def test_01_database_initialization(self):
        """Test 1: Verify tables and indexes exist in SQLite database."""
        with get_db_connection(TEST_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('scan_history', 'audit_events')"
            )
            tables = [row["name"] for row in cursor.fetchall()]
            self.assertIn("scan_history", tables)
            self.assertIn("audit_events", tables)

            # Verify scan_history table schema contains NO raw PII columns
            cursor.execute("PRAGMA table_info(scan_history)")
            cols = [row["name"] for row in cursor.fetchall()]
            for pii_col in ["email", "phone", "aadhaar", "pan", "bank_account", "text", "raw_text"]:
                self.assertNotIn(pii_col, cols, f"Forbidden PII column found: {pii_col}")

    def test_02_scan_history_creation(self):
        """Test 2: Create a scan record and verify safe metadata is persisted."""
        scan_id = create_scan_record(
            input_type="text",
            risk_before=75,
            detected_count=3,
            db_path=TEST_DB_PATH,
        )
        self.assertIsInstance(scan_id, int)
        self.assertGreater(scan_id, 0)

        with get_db_connection(TEST_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM scan_history WHERE id = ?", (scan_id,))
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row["input_type"], "text")
            self.assertEqual(row["risk_before"], 75)
            self.assertEqual(row["detected_count"], 3)
            self.assertEqual(row["protected_count"], 0)

    def test_03_protection_history_update(self):
        """Test 3: Update scan history with protection decisions and SHA-256 hash."""
        scan_id = create_scan_record(
            input_type="text",
            risk_before=80,
            detected_count=4,
            db_path=TEST_DB_PATH,
        )
        receipt_hash = hashlib.sha256(b"sanitized text output").hexdigest()

        updated = update_scan_protection(
            scan_id=scan_id,
            purpose="expense_reimbursement",
            risk_after=15,
            protected_count=3,
            kept_count=1,
            output_file_type="text",
            protection_receipt_hash=receipt_hash,
            db_path=TEST_DB_PATH,
        )
        self.assertTrue(updated)

        with get_db_connection(TEST_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM scan_history WHERE id = ?", (scan_id,))
            row = cursor.fetchone()
            self.assertEqual(row["purpose"], "expense_reimbursement")
            self.assertEqual(row["risk_after"], 15)
            self.assertEqual(row["protected_count"], 3)
            self.assertEqual(row["kept_count"], 1)
            self.assertEqual(row["protection_percentage"], 75.0)
            self.assertEqual(row["protection_receipt_hash"], receipt_hash)

    def test_04_privacy_first_no_raw_pii_stored(self):
        """Test 4: CRITICAL - Verify test PII strings are NEVER present in SQLite."""
        # Use explicit sensitive test strings required by user
        test_bank = "4821 0098 7712"
        test_upi = "rahul@bank"
        test_email = "rahul@example.com"

        sample_text = f"Transfer funds to Bank Account: {test_bank}, UPI: {test_upi}, Contact: {test_email}."

        # Scan text via API
        scan_resp = self.client.post("/api/scan/text", json={"text": sample_text})
        self.assertEqual(scan_resp.status_code, 200)
        scan_data = scan_resp.json()
        scan_id = scan_data.get("scan_id")
        self.assertIsNotNone(scan_id)

        # Protect text via API
        protect_resp = self.client.post(
            "/api/protect/text",
            json={
                "text": sample_text,
                "detected": scan_data["detected"],
                "decisions": {"bank_account": "PROTECT", "upi": "PROTECT", "email": "PROTECT"},
                "purpose": "general_sharing",
                "scan_id": scan_id,
            },
        )
        self.assertEqual(protect_resp.status_code, 200)

        # SECURITY INSPECTION: Inspect entire SQLite database for the raw sensitive strings
        with get_db_connection(TEST_DB_PATH) as conn:
            cursor = conn.cursor()

            # Inspect scan_history
            cursor.execute("SELECT * FROM scan_history")
            scan_rows = cursor.fetchall()
            for row in scan_rows:
                for val in row:
                    val_str = str(val)
                    self.assertNotIn(test_bank, val_str, "Raw Bank Account leaked in scan_history!")
                    self.assertNotIn(test_upi, val_str, "Raw UPI ID leaked in scan_history!")
                    self.assertNotIn(test_email, val_str, "Raw Email leaked in scan_history!")

            # Inspect audit_events
            cursor.execute("SELECT * FROM audit_events")
            audit_rows = cursor.fetchall()
            for row in audit_rows:
                for val in row:
                    val_str = str(val)
                    self.assertNotIn(test_bank, val_str, "Raw Bank Account leaked in audit_events!")
                    self.assertNotIn(test_upi, val_str, "Raw UPI ID leaked in audit_events!")
                    self.assertNotIn(test_email, val_str, "Raw Email leaked in audit_events!")

    def test_05_get_history_api(self):
        """Test 5: GET /api/history returns recent safe metadata."""
        resp = self.client.get("/api/history")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertIsInstance(data["history"], list)
        self.assertGreater(len(data["history"]), 0)

        item = data["history"][0]
        self.assertIn("id", item)
        self.assertIn("timestamp", item)
        self.assertIn("input_type", item)
        self.assertIn("risk_before", item)
        self.assertIn("risk_after", item)
        self.assertIn("detected_count", item)
        self.assertIn("protected_count", item)
        self.assertIn("safe_to_share", item)

    def test_06_get_history_limit_validation(self):
        """Test 6: GET /api/history?limit=X validates boundaries."""
        # Valid limit
        resp = self.client.get("/api/history?limit=2")
        self.assertEqual(resp.status_code, 200)
        self.assertLessEqual(len(resp.json()["history"]), 2)

        # Invalid limit: negative or zero (rejected with 422)
        resp_zero = self.client.get("/api/history?limit=0")
        self.assertEqual(resp_zero.status_code, 422)

        # Invalid limit: above 100 (rejected with 422)
        resp_large = self.client.get("/api/history?limit=500")
        self.assertEqual(resp_large.status_code, 422)

    def test_07_get_stats_api(self):
        """Test 7: GET /api/stats returns all aggregated privacy metrics."""
        resp = self.client.get("/api/stats")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])

        stats = data["stats"]
        required_keys = [
            "total_scans",
            "text_scans",
            "image_scans",
            "pdf_scans",
            "protected_documents",
            "total_sensitive_items_detected",
            "total_sensitive_items_protected",
            "leaks_averted",
            "average_risk_before",
            "average_risk_after",
            "average_exposure_reduction",
        ]
        for k in required_keys:
            self.assertIn(k, stats, f"Missing stats metric: {k}")

        self.assertGreaterEqual(stats["total_scans"], 1)
        self.assertGreaterEqual(stats["leaks_averted"], 1)

    def test_08_deterministic_leaks_averted_metric(self):
        """Test 8: Verify leaks_averted deterministic definition."""
        # Clean isolation test: verify definition
        stats = get_privacy_stats(db_path=TEST_DB_PATH)
        self.assertIsInstance(stats["leaks_averted"], int)
        # Definition: detected_count > 0 AND protected_count > 0
        with get_db_connection(TEST_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) AS expected FROM scan_history WHERE detected_count > 0 AND protected_count > 0"
            )
            expected = cursor.fetchone()["expected"]
            self.assertEqual(stats["leaks_averted"], expected)

    def test_09_risk_before_after_exposure_reduction(self):
        """Test 9: Verify accurate calculation of risk_before, risk_after, exposure_reduction."""
        sample_text = "Card: 4532 0150 1234 5678, Phone: 9876543210"
        scan_resp = self.client.post("/api/scan/text", json={"text": sample_text})
        scan_data = scan_resp.json()
        risk_before = scan_data["risk"]["score"]
        self.assertGreater(risk_before, 0)

        # Keep phone (LOW risk), Protect card (CRITICAL risk)
        protect_resp = self.client.post(
            "/api/protect/text",
            json={
                "text": sample_text,
                "detected": scan_data["detected"],
                "decisions": {"card": "PROTECT", "phone": "KEEP"},
                "scan_id": scan_data["scan_id"],
            },
        )
        prot_data = protect_resp.json()
        self.assertEqual(prot_data["risk_before"], risk_before)
        self.assertLess(prot_data["risk_after"], risk_before)
        self.assertGreater(prot_data["exposure_reduction"], 0.0)

    def test_10_sha256_protection_receipt(self):
        """Test 10: Verify SHA-256 protection receipt matches hash of output."""
        sample_text = "Contact: john@acme.com"
        scan_resp = self.client.post("/api/scan/text", json={"text": sample_text})
        scan_data = scan_resp.json()

        protect_resp = self.client.post(
            "/api/protect/text",
            json={
                "text": sample_text,
                "detected": scan_data["detected"],
                "decisions": {"email": "PROTECT"},
            },
        )
        prot_data = protect_resp.json()
        self.assertIn("protection_receipt", prot_data)
        receipt = prot_data["protection_receipt"]
        self.assertEqual(receipt["algorithm"], "SHA-256")

        # Verify hash matches SHA-256 of protected_text
        expected_hash = hashlib.sha256(prot_data["protected_text"].encode("utf-8")).hexdigest()
        self.assertEqual(receipt["hash"], expected_hash)

    def test_11_multiple_scans_and_file_types(self):
        """Test 11: Verify input_type counters for text, image, and pdf."""
        create_scan_record(input_type="image", risk_before=50, detected_count=2, db_path=TEST_DB_PATH)
        create_scan_record(input_type="pdf", risk_before=60, detected_count=3, db_path=TEST_DB_PATH)

        stats = get_privacy_stats(db_path=TEST_DB_PATH)
        self.assertGreaterEqual(stats["image_scans"], 1)
        self.assertGreaterEqual(stats["pdf_scans"], 1)
        self.assertGreaterEqual(stats["text_scans"], 1)

    def test_12_audit_events_lifecycle_logging(self):
        """Test 12: Verify audit events are properly recorded across lifecycle."""
        ev_id = record_audit_event(
            event_type="PURPOSE_SELECTED",
            input_type="text",
            purpose="expense_reimbursement",
            metadata={"recommended_keep": 2, "recommended_protect": 3},
            db_path=TEST_DB_PATH,
        )
        self.assertIsInstance(ev_id, int)

        with get_db_connection(TEST_DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_events WHERE event_id = ?", (ev_id,))
            row = cursor.fetchone()
            self.assertEqual(row["event_type"], "PURPOSE_SELECTED")
            self.assertEqual(row["purpose"], "expense_reimbursement")
            self.assertIn("recommended_keep", row["metadata_json"])

    def test_13_empty_database_handling(self):
        """Test 13: Verify graceful response on a fresh/empty database."""
        empty_db_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "empty_test.db"
        )
        if os.path.exists(empty_db_path):
            os.remove(empty_db_path)
        init_db(empty_db_path)

        empty_stats = get_privacy_stats(db_path=empty_db_path)
        self.assertEqual(empty_stats["total_scans"], 0)
        self.assertEqual(empty_stats["leaks_averted"], 0)
        self.assertEqual(empty_stats["average_risk_before"], 0.0)
        self.assertEqual(empty_stats["average_risk_after"], 0.0)

        empty_history = get_history(limit=10, db_path=empty_db_path)
        self.assertEqual(empty_history, [])

        if os.path.exists(empty_db_path):
            os.remove(empty_db_path)

    def test_14_forbidden_pii_metadata_prevention(self):
        """Test 14: Verify models reject any metadata containing forbidden PII keys."""
        with self.assertRaises(ValueError):
            record_audit_event(
                event_type="SECURITY_TEST",
                input_type="text",
                metadata={"email": "hacker@test.com"},  # Forbidden key
                db_path=TEST_DB_PATH,
            )


if __name__ == "__main__":
    unittest.main()

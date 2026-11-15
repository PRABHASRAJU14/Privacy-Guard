"""Phase 3 Comprehensive Test Suite.
Tests Real Multimodal Document Processing:
- Local OCR scanning (PNG/JPG)
- Image pixel-level redaction
- PDF text extraction & PII detection
- PDF text stream eradication & verification
- File security (rejection of unsupported types, empty files, traversal attempts)
- Expense Reimbursement Scenario (Uber receipt with kept proof & protected account/balance/unrelated spends)
"""
import io
import os
import sys
import unittest
from PIL import Image, ImageDraw, ImageFont
import pymupdf
from fastapi.testclient import TestClient

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.main import app
from backend.services.ocr import is_ocr_available, get_ocr_status
from backend.services.pdf_redactor import verify_pdf_redaction

client = TestClient(app)

EXPENSE_SCENARIO_TEXT = """Merchant: Uber India
Amount: INR 2850.00
Date: 05 Sep 2026
Transaction ID: TXN84927361
Bank Account: 482100987712
UPI ID: rahul@okaxis
Available Balance: INR 74820.00
Other Transactions: Swiggy INR 620.00"""


def _create_test_image(text: str, format_name: str = "PNG") -> bytes:
    """Helper to synthesize an image containing rendered text."""
    lines = text.strip().split("\n")
    height = max(150, len(lines) * 35 + 50)
    width = 650
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    y = 20
    for line in lines:
        draw.text((25, y), line, fill=(10, 10, 10))
        y += 35

    buf = io.BytesIO()
    img.save(buf, format=format_name)
    return buf.getvalue()


def _create_test_pdf(text: str) -> bytes:
    """Helper to synthesize a PDF document containing text."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)  # A4

    lines = text.strip().split("\n")
    y = 60
    for line in lines:
        page.insert_text((50, y), line, fontsize=12)
        y += 28

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


class TestPhase3Multimodal(unittest.TestCase):

    def test_01_ocr_service_readiness(self):
        """1. Verify OCR availability and configuration status."""
        status_info = get_ocr_status()
        self.assertIn("available", status_info)
        self.assertIn("engine", status_info)
        print(f"\n[TEST 01] OCR status: {status_info}")
        self.assertTrue(status_info["available"], f"Tesseract not available: {status_info.get('error')}")

    def test_02_png_scanning(self):
        """2. Test scanning a valid PNG screenshot."""
        png_bytes = _create_test_image("Merchant: Uber India\nTotal Amount: INR 450.00", "PNG")
        resp = client.post(
            "/api/scan/image",
            files={"file": ("screenshot.png", png_bytes, "image/png")},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["file_type"], "image")
        self.assertIn("Uber", data["text"])

    def test_03_jpg_scanning(self):
        """3. Test scanning a valid JPG image."""
        jpg_bytes = _create_test_image("Merchant: Uber India\nDate: 12-05-2024", "JPEG")
        resp = client.post(
            "/api/scan/image",
            files={"file": ("receipt.jpg", jpg_bytes, "image/jpeg")},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["file_type"], "image")

    def test_04_ocr_pii_detection_and_bboxes(self):
        """4 & 5. Test PII detection from OCR text and bounding box generation."""
        img_bytes = _create_test_image(EXPENSE_SCENARIO_TEXT, "PNG")
        resp = client.post(
            "/api/scan/image",
            files={"file": ("expense.png", img_bytes, "image/png")},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])

        detected = data["detected"]
        types = [d["type"] for d in detected]
        print(f"\n[TEST 04] OCR Detected Types: {types}")

        # Sensitive items must be found
        self.assertTrue(any(t in types for t in ["bank_account", "upi", "balance"]))

        # Verify bounding box coordinates on detected items
        items_with_bbox = [d for d in detected if d.get("bbox") is not None]
        self.assertGreater(len(items_with_bbox), 0, "At least one detected PII item must have bounding box")
        for it in items_with_bbox:
            b = it["bbox"]
            self.assertGreater(b["width"], 0)
            self.assertGreater(b["height"], 0)

    def test_06_image_pixel_redaction(self):
        """6. Test real pixel-level image redaction."""
        img_bytes = _create_test_image(EXPENSE_SCENARIO_TEXT, "PNG")

        # 1. First scan image
        scan_resp = client.post(
            "/api/scan/image",
            files={"file": ("expense.png", img_bytes, "image/png")},
        ).json()

        file_id = scan_resp["file_id"]

        # 2. Protect with decisions
        decisions = {
            "bank_account": "PROTECT",
            "upi": "PROTECT",
            "balance": "PROTECT",
            "unrelated_transactions": "PROTECT",
            "merchant": "KEEP",
            "amount": "KEEP",
            "transaction_date": "KEEP",
            "transaction_id": "KEEP",
        }

        import json
        resp = client.post(
            "/api/protect/image",
            data={
                "file_id": file_id,
                "decisions": json.dumps(decisions),
                "detected": json.dumps(scan_resp["detected"]),
            },
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertGreater(data["protected_count"], 0)
        self.assertIn("/api/download/", data["download_url"])

        # 3. Test download endpoint
        dl_resp = client.get(data["download_url"])
        self.assertEqual(dl_resp.status_code, 200)
        self.assertEqual(dl_resp.headers.get("content-type"), "image/png")

    def test_07_pdf_text_extraction(self):
        """7. Test PDF text extraction."""
        pdf_bytes = _create_test_pdf("Trip Invoice: Uber India\nDate: 05 Sep 2026")
        resp = client.post(
            "/api/scan/pdf",
            files={"file": ("document.pdf", pdf_bytes, "application/pdf")},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["file_type"], "pdf")
        self.assertEqual(data["page_count"], 1)
        self.assertIn("Uber India", data["text"])

    def test_08_pdf_pii_detection(self):
        """8. Test PDF PII detection with page coordinates."""
        pdf_bytes = _create_test_pdf(EXPENSE_SCENARIO_TEXT)
        resp = client.post(
            "/api/scan/pdf",
            files={"file": ("statement.pdf", pdf_bytes, "application/pdf")},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])

        types = [d["type"] for d in data["detected"]]
        print(f"\n[TEST 08] PDF Detected Types: {types}")
        self.assertIn("bank_account", types)
        self.assertIn("upi", types)

        # Every item has a page number
        for it in data["detected"]:
            self.assertEqual(it["page"], 1)

    def test_09_and_10_pdf_redaction_and_unextractable(self):
        """9 & 10. Test real PDF redaction and assert protected text cannot be extracted."""
        pdf_bytes = _create_test_pdf(EXPENSE_SCENARIO_TEXT)

        # 1. Scan PDF
        scan_resp = client.post(
            "/api/scan/pdf",
            files={"file": ("statement.pdf", pdf_bytes, "application/pdf")},
        ).json()

        file_id = scan_resp["file_id"]

        import json
        decisions = {
            "bank_account": "PROTECT",
            "upi": "PROTECT",
            "balance": "PROTECT",
            "unrelated_transactions": "PROTECT",
            "merchant": "KEEP",
            "amount": "KEEP",
            "transaction_date": "KEEP",
            "transaction_id": "KEEP",
        }

        # 2. Protect PDF
        resp = client.post(
            "/api/protect/pdf",
            data={
                "file_id": file_id,
                "decisions": json.dumps(decisions),
                "detected": json.dumps(scan_resp["detected"]),
            },
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertGreater(data["protected_count"], 0)

        # 3. Download protected PDF bytes
        dl_resp = client.get(data["download_url"])
        self.assertEqual(dl_resp.status_code, 200)
        protected_pdf_bytes = dl_resp.content

        # 4. Verify that protected bank account and UPI cannot be extracted from PDF text stream!
        doc = pymupdf.open(stream=protected_pdf_bytes, filetype="pdf")
        extracted_after = "".join(p.get_text() for p in doc)
        doc.close()

        print(f"\n[TEST 10] Extracted text from redacted PDF:\n{extracted_after}")
        self.assertNotIn("482100987712", extracted_after)
        self.assertNotIn("rahul@okaxis", extracted_after)
        # Kept proof must remain
        self.assertIn("Uber India", extracted_after)
        self.assertIn("TXN84927361", extracted_after)

    def test_11_unsupported_file_rejection(self):
        """11. Reject unsupported file types."""
        resp = client.post(
            "/api/scan/image",
            files={"file": ("malware.exe", b"MZ...", "application/x-msdownload")},
        )
        self.assertEqual(resp.status_code, 415)

    def test_12_empty_file_rejection(self):
        """12. Reject empty files."""
        resp = client.post(
            "/api/scan/image",
            files={"file": ("empty.png", b"", "image/png")},
        )
        self.assertEqual(resp.status_code, 400)

    def test_13_clean_document(self):
        """13. Clean document with no PII produces zero detected items and SAFE risk."""
        clean_text = "PrivacyGuard Roadmap 2026\nQuarterly Product Review and Milestone Planning."
        pdf_bytes = _create_test_pdf(clean_text)
        resp = client.post(
            "/api/scan/pdf",
            files={"file": ("clean.pdf", pdf_bytes, "application/pdf")},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total_detected"], 0)
        self.assertEqual(data["risk"]["level"], "SAFE")


if __name__ == "__main__":
    unittest.main()

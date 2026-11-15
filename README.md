# PrivacyGuard 🛡️ — Personal Data Leak Prevention & Purpose-Aware Privacy Layer

> **Share Smart. Stay Private.**  
> A local-first, zero-knowledge privacy protection platform that minimizes personal data exposure before sharing receipts, documents, and text.

---

## 🌟 Key Features

* **🎯 Purpose-Aware Data Minimization:** Contextually evaluates what needs to be kept vs. redacted based on sharing purpose (*Expense Reimbursement*, *Bank Verification*, *Loan Application*, *Job Application*, *Public Posting*).
* **🔒 100% Local & Zero-Knowledge:** All regex parsing, checksum validation, OCR, and redaction runs locally on `127.0.0.1`. Zero data sent to the cloud.
* **📄 Multimodal Support:**
  * **Plain Text:** In-place token sanitization (e.g. `[REDACTED BANK ACCOUNT]`).
  * **Screenshots & Photos (JPG/PNG):** Automatic EXIF orientation fix + local 64-bit Tesseract OCR + true pixel-level solid bounding box overwrite.
  * **PDF Documents:** Direct PyMuPDF vector redaction scrubbing text streams and underlying image slices.
* **🇮🇳 Indian Context Support:** Native detection and algorithmic checksums for **Aadhaar** (Verhoeff algorithm), **PAN Cards**, **Payment Cards** (Luhn formula), **UPI VPAs** (Paytm, PhonePe, Google Pay), and **IFSC Codes**.
* **🧩 Chrome Extension (Manifest V3):** In-page active DOM monitoring with a floating status shield, real-time exposure badge, and 1-click in-page text replacement.
* **🧾 Cryptographic Receipts:** Generates SHA-256 verification hash and exposure reduction percentage.

---

## 🏗️ System Architecture & Documentation

Full architectural specifications are available in the repository root:
* [Product Requirements Document (PRD.md)](PRD.md)
* [High-Level Design (HLD.md)](HLD.md)
* [Low-Level Design (LLD.md)](LLD.md)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Python 3.10+**
* *(Optional for Image OCR)* **64-bit Tesseract OCR**: [UB-Mannheim Installer](https://github.com/UB-Mannheim/tesseract/wiki) installed to `C:\Program Files\Tesseract-OCR`.

### 2. Launch the Application
Simply double-click the Windows batch launcher:
```bash
run.bat
```
This automatically:
1. Starts the FastAPI backend at `http://127.0.0.1:8000`.
2. Opens the Web Application at `Privacy Guard/html/landing.html`.

### 3. Load the Chrome Browser Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `extension/` folder.
4. Test on any webpage or visit `http://127.0.0.1:8000/extension/demo.html`.

---

## 📊 API Documentation

Once the server is running, explore the interactive Swagger documentation at:
* **Interactive Docs:** `http://127.0.0.1:8000/docs`
* **Alternative ReDoc:** `http://127.0.0.1:8000/redoc`

---

## 🛡️ License & Ethics
Built for privacy-first, ethical digital document sharing.


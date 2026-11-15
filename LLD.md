# Low-Level Design (LLD)

## Project: PrivacyGuard — Purpose-Aware Personal Data Leak Prevention System
* **Document Version:** 1.0.0
* **Status:** Approved / Active
* **Date:** November 2026

---

## 1. Codebase Directory Structure

```text
Privacy Guard/
├── PRD.md                         # Product Requirements Document
├── HLD.md                         # High-Level Architecture Design
├── LLD.md                         # Low-Level Detailed Design
├── run.bat                        # System launcher (FastAPI + Browser)
│
├── backend/                       # Python FastAPI Backend Layer
│   ├── main.py                    # Server entrypoint, CORS, static mounts
│   ├── uploads/                   # Ephemeral upload storage
│   ├── protected/                 # Redacted deliverables storage
│   ├── privacyguard.db            # SQLite metadata database
│   │
│   ├── api/                       # API Route Controllers
│   │   ├── scan.py                # POST /api/scan/text
│   │   ├── scan_file.py           # POST /api/scan/image, POST /api/scan/pdf
│   │   ├── purpose.py             # POST /api/analyze/purpose
│   │   ├── protect.py             # POST /api/protect/text
│   │   ├── protect_file.py        # POST /api/protect/image, POST /api/protect/pdf
│   │   └── history.py             # GET /api/history, GET /api/stats
│   │
│   ├── schemas/                   # Pydantic v2 Data Models
│   │   ├── scan.py                # TextScanRequest, TextScanResponse, DetectedPIIItem
│   │   ├── document.py            # ImageScanResponse, PdfScanResponse, BBox
│   │   ├── purpose.py             # PurposeAnalyzeRequest, PurposeAnalyzeResponse
│   │   ├── protection.py          # TextProtectRequest, TextProtectResponse, Receipt
│   │   └── history.py             # HistoryResponse, StatsResponse, PrivacyStats
│   │
│   ├── services/                  # Business Logic & Algorithms
│   │   ├── pii_detector.py        # Deterministic PII extraction pipeline
│   │   ├── validator.py           # Verhoeff, Luhn, IFSC, PAN algorithms
│   │   ├── risk_engine.py         # Multi-factor risk scoring formula
│   │   ├── purpose_engine.py      # Purpose minimization rules matrix
│   │   ├── ocr.py                 # Tesseract OCR wrapper & BBox mapper
│   │   ├── text_redactor.py       # Exact string token replacement
│   │   ├── image_redactor.py      # Pillow solid pixel overwriting
│   │   └── pdf_redactor.py        # PyMuPDF vector sanitization
│   │
│   └── database/                  # Persistence Layer
│       ├── database.py            # SQLite connection, WAL mode, tables
│       └── models.py              # Query operations & safe metrics calculation
│
├── extension/                     # Chrome Browser Extension (Manifest V3)
│   ├── manifest.json              # Extension metadata and permissions
│   ├── background.js              # Service worker & API message dispatcher
│   ├── content.js                 # In-page DOM observer & floating shield
│   ├── popup.html / popup.js      # Toolbar popup & quick-scanner
│   ├── popup.css                  # Popup glassmorphic styles
│   ├── demo.html                  # Local test email compose screen
│   └── icons/                     # 16px, 48px, 128px PNG icons
│
└── Privacy Guard/                 # Web Application Frontend
    ├── html/                      # Multi-page application views
    │   ├── landing.html           # Landing page with video demo showcase
    │   ├── scan.html              # Drag-and-drop scanning interface
    │   ├── purpose.html           # Purpose minimization selector
    │   ├── protect.html           # Side-by-side comparison & redaction view
    │   ├── result.html            # Scan report & risk breakdown
    │   └── share.html             # Final export, receipt, and copy tools
    ├── css/                       # Design System Stylesheets
    │   ├── theme.css              # Color tokens, glassmorphism, dark/light vars
    │   ├── landing.css            # Landing page layout & video viewer
    │   ├── scan.css               # Scan dropzone & loader animations
    │   └── protect.css            # Redaction diff cards & visual indicators
    └── js/                        # Client Controllers
        ├── landing.js             # Showcase controller & theme synchronizer
        ├── scan.js                # Upload handler, OCR API bridge & fallback
        ├── purpose.js             # Policy matrix UI synchronizer
        ├── protect.js             # Masking execution & interactive toggles
        └── share.js               # Download trigger & clipboard exporter
```

---

## 2. Database Schema (SQLite 3)

The database strictly records **safe operational telemetry and audit metadata**. Raw text, OCR transcripts, image buffers, and decrypted PII values are forbidden from persistence.

### 2.1 Table: `scan_history`
```sql
CREATE TABLE IF NOT EXISTS scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,                  -- ISO 8601 UTC string
    input_type TEXT NOT NULL,                 -- 'text' | 'image' | 'pdf'
    filename_hash TEXT,                       -- SHA-256 of original filename
    purpose TEXT,                             -- e.g. 'expense_reimbursement'
    risk_before INTEGER NOT NULL DEFAULT 0,   -- 0 to 100
    risk_after INTEGER NOT NULL DEFAULT 0,    -- 0 to 100
    detected_count INTEGER NOT NULL DEFAULT 0,
    protected_count INTEGER NOT NULL DEFAULT 0,
    kept_count INTEGER NOT NULL DEFAULT 0,
    protection_percentage REAL NOT NULL DEFAULT 0.0,
    safe_to_share INTEGER NOT NULL DEFAULT 1, -- 1 = True, 0 = False
    output_file_type TEXT,                    -- 'text' | 'image/png' | 'application/pdf'
    protection_receipt_hash TEXT              -- Deterministic SHA-256 receipt
);

CREATE INDEX IF NOT EXISTS idx_scan_history_timestamp ON scan_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scan_history_input_type ON scan_history(input_type);
```

### 2.2 Table: `audit_events`
```sql
CREATE TABLE IF NOT EXISTS audit_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,                 -- 'SCAN_COMPLETED' | 'REDACTION_APPLIED'
    scan_id INTEGER,                          -- Foreign key to scan_history
    input_type TEXT NOT NULL,
    purpose TEXT,
    risk_before INTEGER,
    risk_after INTEGER,
    protected_count INTEGER,
    metadata_json TEXT,                       -- Entity category counts (e.g. {"financial": 3})
    FOREIGN KEY (scan_id) REFERENCES scan_history(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_events_scan_id ON audit_events(scan_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
```

---

## 3. Data Models & Schemas (Pydantic v2)

### 3.1 Bounding Box Schema (`BBox`)
```python
class BBox(BaseModel):
    left: int
    top: int
    width: int
    height: int
```

### 3.2 Detected PII Schema (`DetectedPIIItem`)
```python
class DetectedPIIItem(BaseModel):
    type: str                  # e.g., 'aadhaar', 'upi', 'bank_account', 'card'
    label: str                 # e.g., 'Aadhaar Number', 'UPI ID'
    value: str                 # Matched token value
    category: str              # 'financial' | 'identity' | 'contact' | 'personal'
    severity: str              # 'HIGH' | 'MEDIUM' | 'LOW'
    risk_weight: int           # Weight between 5 and 35
    start: int                 # String start index
    end: int                   # String end index
    confidence: float          # 0.0 to 1.0
    valid: bool                # Algorithm validation flag (Verhoeff/Luhn)
    bbox: Optional[BBox]       # Spatial coordinates (for images and PDFs)
    explanation: Optional[str] # Human-readable reason for sensitivity
```

### 3.3 Purpose Minimization Schema (`PurposeRecommendation`)
```python
class PurposeRecommendation(BaseModel):
    type: str                  # Entity type identifier
    label: str                 # User-friendly label
    category: str              # Category
    decision: str              # 'KEEP' | 'PROTECT'
    reason: str                # Deterministic explainability text
    is_essential: bool         # Whether required by selected purpose
```

---

## 4. API Endpoint Specifications

### 4.1 POST `/api/scan/text`
* **Summary:** Ingests raw text and identifies all PII candidates with risk scores.
* **Request Body:**
  ```json
  {
    "text": "Merchant: Uber\nAmount: ₹2,850\nBank Account: 4821 0098 7712\nUPI: rahul@okhdfcbank"
  }
  ```
* **Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "scan_id": 42,
    "total_detected": 2,
    "risk": {
      "score": 85,
      "level": "HIGH",
      "exposure_breakdown": { "financial": 85 }
    },
    "detected": [
      {
        "type": "bank_account",
        "label": "Bank Account Number",
        "value": "4821 0098 7712",
        "category": "financial",
        "severity": "HIGH",
        "risk_weight": 30,
        "start": 39,
        "end": 53,
        "valid": true,
        "explanation": "Primary bank account number exposing customer funds."
      },
      {
        "type": "upi",
        "label": "UPI ID",
        "value": "rahul@okhdfcbank",
        "category": "financial",
        "severity": "HIGH",
        "risk_weight": 25,
        "start": 59,
        "end": 75,
        "valid": true,
        "explanation": "Virtual Payment Address directly linked to bank."
      }
    ]
  }
  ```

### 4.2 POST `/api/scan/image`
* **Summary:** Accepts `multipart/form-data` image file (`.png`, `.jpg`, `.jpeg`).
* **Headers:** `Content-Type: multipart/form-data`
* **Form Field:** `file: [binary data]`
* **Processing:** Corrects EXIF rotation, executes local 64-bit Tesseract OCR, matches word coordinates, runs PII detectors.
* **Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "file_id": "upload_a7b8c9d0e1f2.jpg",
    "text": "Extracted OCR text...",
    "total_detected": 1,
    "risk": { "score": 90, "level": "HIGH" },
    "detected": [
      {
        "type": "aadhaar",
        "label": "Aadhaar Number",
        "value": "4567 8912 3456",
        "category": "identity",
        "severity": "HIGH",
        "valid": true,
        "bbox": { "left": 120, "top": 450, "width": 280, "height": 32 }
      }
    ]
  }
  ```

### 4.3 POST `/api/analyze/purpose`
* **Summary:** Evaluates detected items against a chosen sharing purpose.
* **Request Body:**
  ```json
  {
    "purpose": "expense_reimbursement",
    "detected": [
      { "type": "amount", "value": "₹2,850" },
      { "type": "bank_account", "value": "4821 0098 7712" }
    ]
  }
  ```
* **Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "purpose": "expense_reimbursement",
    "purpose_name": "Expense Reimbursement Claim",
    "total_keep": 1,
    "total_protect": 1,
    "recommendations": [
      {
        "type": "amount",
        "decision": "KEEP",
        "reason": "Total transaction amount is required by finance for claim verification."
      },
      {
        "type": "bank_account",
        "decision": "PROTECT",
        "reason": "Personal bank account number is not required for expense approval."
      }
    ]
  }
  ```

### 4.4 POST `/api/protect/text`
* **Summary:** Generates sanitized text, computes exposure reduction, and outputs a SHA-256 verification hash.
* **Request Body:**
  ```json
  {
    "text": "Merchant: Uber\nAmount: ₹2,850\nBank Account: 4821 0098 7712",
    "detected": [...],
    "decisions": { "bank_account": "PROTECT", "amount": "KEEP" },
    "purpose": "expense_reimbursement"
  }
  ```
* **Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "protected_text": "Merchant: Uber\nAmount: ₹2,850\nBank Account: [REDACTED BANK ACCOUNT]",
    "risk_before": 85,
    "risk_after": 15,
    "exposure_reduction": 82.35,
    "protected_count": 1,
    "kept_count": 1,
    "receipt": {
      "sha256": "3e9b1c7f4a...8d2e",
      "timestamp": "2026-11-15T10:40:00Z",
      "purpose": "expense_reimbursement"
    }
  }
  ```

---

## 5. Core Algorithms & Mathematical Implementation

### 5.1 Aadhaar Checksum: Verhoeff Algorithm
The Verhoeff algorithm utilizes dihedral group $D_5$ multiplication over permutation matrices to detect all single-digit errors and adjacent transposition errors.

```python
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
    digits = re.sub(r"\D", "", num_str)
    if not digits:
        return False
    c = 0
    for i, item in enumerate(reversed(digits)):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][int(item)]]
    return c == 0
```

### 5.2 Payment Card Checksum: Luhn Formula
$$\sum_{i=1}^{n} f(d_i) \equiv 0 \pmod{10}, \quad f(d_i) = \begin{cases} d_i & \text{if position is even from right} \\ 2d_i - 9 & \text{if } 2d_i > 9 \\ 2d_i & \text{otherwise} \end{cases}$$

### 5.3 Composite Risk Score Formula
The risk engine aggregates individual entity weights ($w_i$), applies category multipliers ($M_c$), and clamps to a maximum score of 100:

$$\text{RawScore} = \sum_{i=1}^{k} \left( w_i \times \text{Confidence}_i \right) \times \left(1 + 0.15 \times (N_{\text{high}} - 1)\right)$$
$$\text{RiskScore} = \min\left(100, \text{round}(\text{RawScore})\right)$$

* **Risk Level Thresholds:**
  * $\text{Score} \ge 70 \implies \text{HIGH RISK}$ (Red)
  * $40 \le \text{Score} < 70 \implies \text{MEDIUM RISK}$ (Amber)
  * $\text{Score} < 40 \implies \text{LOW RISK}$ (Blue/Green)

### 5.4 Spatial Bounding Box Alignment (`find_entity_bbox`)
To match detected PII strings against disjoint OCR word boxes, the algorithm uses a three-tier heuristic:
1. **Tier 1 (Exact Single-Word Match):** Strips punctuation and matches normalized tokens.
2. **Tier 2 (Continuous Word-Span Search):** Slides across OCR words matching sequences where target words equal box text in order. Computes union box:
   $$x_0 = \min_{w \in \text{span}} w.\text{left}, \quad y_0 = \min_{w \in \text{span}} w.\text{top}$$
   $$x_1 = \max_{w \in \text{span}} (w.\text{left} + w.\text{width}), \quad y_1 = \max_{w \in \text{span}} (w.\text{top} + w.\text{height})$$
3. **Tier 3 (Character Concatenation Window):** Concatenates normalized character buffers up to 8 consecutive boxes to bridge fragmented OCR splits (e.g., spaces inside an account number `4821 0098`).

### 5.5 Pixel-Level Solid Overwrite Redaction
Unlike superficial CSS masks or transparent overlays, `redact_image_pixels` performs an in-place RGB buffer overwrite:
```python
padding = 4
x0 = max(0, left - padding)
y0 = max(0, top - padding // 2)
x1 = min(img_width, left + width + padding)
y1 = min(img_height, top + height + padding // 2)

draw = ImageDraw.Draw(redacted_image)
draw.rectangle([x0, y0, x1, y1], fill=(20, 24, 33), outline=(20, 24, 33))
```

---

## 6. Purpose Minimization Decision Matrix

| Entity Type | Expense Claim | Bank Verification | Job Application | Rental / Address | Public Post |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Transaction Amount** | **KEEP** | PROTECT | PROTECT | PROTECT | PROTECT |
| **Transaction Date** | **KEEP** | **KEEP** | PROTECT | PROTECT | PROTECT |
| **Merchant Name** | **KEEP** | PROTECT | PROTECT | PROTECT | PROTECT |
| **Bank Account No** | PROTECT | **KEEP** | PROTECT | PROTECT | PROTECT |
| **IFSC Code** | PROTECT | **KEEP** | PROTECT | PROTECT | PROTECT |
| **UPI ID / VPA** | PROTECT | PROTECT | PROTECT | PROTECT | PROTECT |
| **Aadhaar Number** | PROTECT | PROTECT | PROTECT | PROTECT | PROTECT |
| **Full Legal Name** | PROTECT | **KEEP** | **KEEP** | **KEEP** | PROTECT |
| **Phone Number** | PROTECT | PROTECT | **KEEP** | PROTECT | PROTECT |
| **Email Address** | PROTECT | PROTECT | **KEEP** | PROTECT | PROTECT |

---

## 7. Error Handling & Edge Cases

| Failure Scenario | Root Cause | System Remediation & Fallback |
| :--- | :--- | :--- |
| **Missing / Broken Tesseract** | 32-bit binary clash or missing path | `_is_executable_functional()` catches failure, returns HTTP 503 with exact UB-Mannheim 64-bit download URL. |
| **Sideways Smartphone JPG** | Missing EXIF rotation in raw bytes | `ImageOps.exif_transpose()` auto-orients pixels to standard 0° orientation before OCR execution. |
| **Empty File Upload** | 0-byte file dropped by user | Returns clean HTTP 400 with `"Uploaded image file is empty"`. |
| **File Exceeds 10 MB** | Large scan or video uploaded | File size checked in-stream; returns HTTP 413 Payload Too Large without crashing memory. |
| **Unformatted Indian Card** | Spaces or dashes in card number | Strips delimiters before running 16-digit Luhn mod-10 validation. |
| **Backend Offline (Extension)** | FastAPI server stopped | Chrome extension displays offline warning banner with a dedicated "Retry" connection button. |


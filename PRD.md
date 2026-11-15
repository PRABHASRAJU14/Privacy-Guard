# Product Requirements Document (PRD)

## Project: PrivacyGuard — Purpose-Aware Personal Data Leak Prevention System
* **Document Version:** 1.0.0
* **Status:** Approved / Active
* **Date:** November 2026
* **Product Tagline:** *Share Smart. Stay Private.*

---

## 1. Executive Summary

In today’s hyper-connected digital economy, sharing screenshots, scanned documents, and plain-text snippets has become standard practice for routine activities—such as claiming workplace expense reimbursements, completing KYC verification, applying for loans or rentals, and sharing payment proofs on chat platforms.

However, modern digital documents (UPI transaction receipts, Aadhaar cards, PAN cards, bank statements, utility bills, salary slips) inherently cause an **"over-sharing dilemma"**: to prove one specific fact (e.g., that a ₹2,850 Uber trip was paid), a user is forced to expose their private bank account numbers, personal UPI VPAs, available balances, and unmasked legal identities.

**PrivacyGuard** is a local-first, zero-knowledge privacy protection platform that introduces **Purpose-Aware Data Minimization**. Rather than forcing users into all-or-nothing sharing or tedious manual black-marker scribbling, PrivacyGuard analyzes documents and text against the user’s specific intent (e.g., *Expense Reimbursement*, *Bank Verification*, *Rental Proof*, *Job Application*), preserving what is strictly necessary while irreversibly redacting all extraneous personal identifiers.

---

## 2. Problem Statement & Target Audience

### 2.1 The Core Problem
1. **The Over-Sharing Dilemma:** Everyday documents bundle sensitive PII (Personally Identifiable Information) with functional proof. Submitting an unedited receipt exposes financial footprints to unintended third parties, corporate accounting queues, or public forums.
2. **Failure of Existing Tools:**
   * *Enterprise DLP Tools* (Google Cloud DLP, AWS Macie) are built for cloud developers and enterprise data lakes, not everyday consumers.
   * *PDF / Legal Redaction Software* (Adobe Acrobat Pro, Redactable) is locked behind expensive subscriptions ($30–$100/mo) and requires complex manual box-drawing.
   * *Mobile Marker/Markup Apps* are 100% manual, prone to human error, and often use semi-transparent brushes that can be reversed by adjusting image exposure.
   * *Cloud "Free Redaction" Sites* require uploading sensitive financial documents to unknown third-party servers, directly violating user privacy.
3. **Indian & Modern Digital Context:** Existing US-centric privacy tools fail to detect Indian PII such as Aadhaar (12-digit UIDAI), PAN (Permanent Account Number), UPI Virtual Payment Addresses (`@okhdfcbank`, `@ptaxis`, `@fam`), and Indian IFSC codes.

### 2.2 Target Audience
* **Corporate & Remote Employees:** Submitting travel, meal, and utility receipts to HR and accounting portals.
* **College Students & Freelancers:** Sharing payment confirmations, split bills, and project invoices on WhatsApp and Discord.
* **Job Seekers:** Submitting resumes and ID proofs without exposing exact home addresses, Aadhaar, or bank details.
* **General Consumers:** Renters and buyers submitting bank account statements or utility bills as address proof.

---

## 3. Product Vision & Principles

* **Local-First & Zero-Cloud:** All detection, OCR, and redactions execute entirely on the user’s device. No raw PII or documents ever leave localhost.
* **Purpose-Aware Minimization:** Redaction policies are driven by business context (GDPR / DPDP compliant data minimization).
* **Deterministic & Explainable:** Every redaction decision provides a plain-English rationale and risk reduction metric.
* **Irreversible Protection:** Redacted pixels and text are permanently removed from output files—no CSS overlays, no hidden metadata.

---

## 4. User Personas & Real-World Use Cases

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER PERSONAS                                   │
├────────────────────────┬───────────────────────┬───────────────────────┤
│ Persona 1: Corporate   │ Persona 2: College    │ Persona 3: Apartment  │
│ Employee (Priya)       │ Student (Varun)       │ Tenant (Rahul)        │
├────────────────────────┼───────────────────────┼───────────────────────┤
│ Goal: Claim ₹2,850     │ Goal: Prove ₹100 chai │ Goal: Submit electric │
│ Uber travel expense.   │ payment on WhatsApp.  │ bill as address proof.│
│ Need: Amount, Date,    │ Need: Amount & "Sent  │ Need: Name & Address. │
│ Merchant, UTR.         │ Successfully" badge.  │ Redact: Customer ID,  │
│ Redact: Bank Account,  │ Redact: Legal names,  │ Tariff details, Prior │
│ Balance, Personal VPA. │ Bank Name, VPA suffix.│ payment history.      │
└────────────────────────┴───────────────────────┴───────────────────────┘
```

---

## 5. Functional Requirements (FR)

### FR-1: Multimodal Ingestion
* **FR-1.1:** System shall support plain-text scanning via direct input or clipboard paste.
* **FR-1.2:** System shall support image uploads (`.png`, `.jpg`, `.jpeg`) with automatic EXIF orientation correction.
* **FR-1.3:** System shall support PDF document uploads (`.pdf`) with multi-page text and vector layer processing.
* **FR-1.4:** File size limit shall be 10 MB per document.

### FR-2: Deterministic PII Detection Engine
The system must identify sensitive entities across multiple categories:
* **Financial:** Bank Account Numbers, UPI IDs / VPAs, Credit/Debit Card Numbers (with Luhn validation), IFSC codes, Account Balances, Spends.
* **Identity (India & Global):** Aadhaar Numbers (with Verhoeff algorithm validation), PAN Card Numbers, Passport Numbers, Driving Licenses.
* **Personal Contact:** Phone Numbers (Indian +91 mobile & landline), Email Addresses, Physical Home Addresses.
* **Temporal & Corporate:** Transaction Reference IDs (UTR), Timestamps, Salary figures.

### FR-3: Purpose Minimization Rules Engine
The engine must map detected entities against pre-configured and custom sharing purposes:
1. `expense_reimbursement`: Keep Merchant, Date, Amount, Transaction Ref; Redact Bank Account, Balance, Personal VPA, Other Spends.
2. `bank_verification`: Keep Account Number, IFSC, Account Holder Name; Redact Balances, Unrelated Transactions.
3. `loan_application`: Keep Monthly Income, Identity, Employer; Redact Personal Spending habits, Non-essential contacts.
4. `job_application`: Keep Candidate Name, Email, Experience; Redact Full Home Address, Aadhaar, PAN, Current Salary.
5. `general_sharing`: Keep High-level narrative; Redact all PII, IDs, Financial identifiers.
6. `public_posting`: Maximum privacy mode; Mask all personal identifiers, account numbers, and location data.

### FR-4: Multi-Layer Redaction Engine
* **FR-4.1 (Text):** Replace sensitive tokens with deterministic semantic tokens (e.g., `[REDACTED BANK ACCOUNT]`, `[REDACTED UPI ID]`).
* **FR-4.2 (Image):** Apply true pixel-level solid bounding boxes directly over detected word coordinates.
* **FR-4.3 (PDF):** Permanently remove text and graphics streams via PyMuPDF vector redaction annotations.

### FR-5: Cryptographic Verification Receipt
* **FR-5.1:** Generate a deterministic SHA-256 hash of the sanitized output to prove integrity.
* **FR-5.2:** Compute and display an **Exposure Reduction Score** (e.g., `73.7% Exposure Reduction`).
* **FR-5.3:** Offer instant single-click **Download Protected File** and **Copy Clean Text**.

### FR-6: Chrome Browser Extension (Manifest V3)
* **FR-6.1:** Real-time form and textarea input inspection with 600ms debounce.
* **FR-6.2:** Floating in-page warning badge when PII is detected.
* **FR-6.3:** 1-Click inline **Protect & Redact** that replaces sensitive form content on the active webpage.
* **FR-6.4:** Extension toolbar popup with health check, page scan, and sample loading.

---

## 6. Non-Functional Requirements (NFR)

* **NFR-1 (Security & Privacy):** Zero external API calls. No telemetry or analytics containing user inputs. SQLite audit logs must record timestamps, entity types, and reduction percentages only—NEVER raw text or PII.
* **NFR-2 (Performance):** Text scan latency < 150 ms. Image OCR latency < 2.5 seconds on standard hardware. PDF processing < 1.8 seconds per 5 pages.
* **NFR-3 (Accuracy):** 100% recall on checksum-validated financial numbers (Aadhaar, Credit Cards, PAN).
* **NFR-4 (Reliability & Compatibility):** Runs offline on Windows, macOS, and Linux across Python 3.10+. Works with Chrome/Edge/Brave browsers.

---

## 7. Metrics & Success KPIs

| Metric | Target | Description |
| :--- | :--- | :--- |
| **Exposure Reduction Rate** | $\ge 70\%$ average | Percentage of unnecessary PII eliminated per transaction |
| **Leak Prevention Accuracy** | $99.2\%$ | Precision and recall for critical financial and national IDs |
| **Client Scan Latency** | $< 300\text{ ms}$ | Time from scan click to policy recommendation |
| **Zero Cloud Leaks** | $100\%$ | Verification that zero network packets egress to cloud endpoints |

---

## 8. Release Roadmap

* **Phase 1 (MVP — Completed):** FastAPI core, Text/Image/PDF scanning, Tesseract integration, Purpose policy engine, Glassmorphism Web UI, Chrome Extension.
* **Phase 2 (Current):** WebAssembly OCR client fallback (Tesseract.js), custom user policy creation, multi-language support (Hindi, Telugu, Tamil).
* **Phase 3 (Future):** Mobile app companion (Android/iOS share sheet integration) and offline desktop tray application.


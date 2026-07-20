# 📄 AI-Assisted Client Statement Summary

## Overview

This project defines a secure, compliant workflow for processing client financial statements and generating AI-assisted summaries. It ensures strict data privacy, confidentiality, and regulatory compliance at every stage.

---

## 🎯 Purpose

This Standard Operating Procedure (SOP) outlines the approved process for:

- Securely handling client PDF statements
- Extracting relevant data
- Generating structured AI summaries
- Maintaining zero data retention

---

## 📌 Scope

This procedure applies to:

- All staff and contractors
- Systems involved in document processing
- AI tools used for summarization

---

## 🔄 Approved Workflow

### 1. Client Document Intake

- Clients upload PDF statements via a secure HTTPS connection
- Explicit consent is required before upload

---

### 2. Temporary File Handling

- Files are stored **temporarily only** in a secure processing environment
- No long-term storage is permitted

---

### 3. PDF Parsing

- PDFs are processed locally or on a secure server
- Only extracted text is used for further processing
- **Raw PDFs are never sent to AI services**

---

### 4. AI Processing

- Extracted text is sent through a secure API
- AI providers must guarantee:
  - No data retention
  - No model training on submitted data
  - No reuse of client information

---

### 5. Summary Generation

- AI generates a structured summary based strictly on provided data
- No assumptions, extrapolations, or inferred content

---

### 6. Delivery to Client

- Summaries are securely returned to the client
- Delivery must maintain encryption and access control

---

### 7. Data Disposal

- Immediately after processing:
  - PDFs are deleted
  - Extracted text is deleted
  - Generated summaries are deleted (unless required for delivery)

---

## 🔐 Privacy & Data Protection

### Privacy Policy Requirements

The organization must clearly state:

- Data is used **only for service delivery**
- No storage of documents, extracted data, or summaries
- No data sharing, selling, or reuse
- Immediate deletion after processing
- AI providers do not retain or train on client data

---

### ✅ Client Consent

Clients must explicitly agree before upload:

> “I authorize the temporary processing of my document for summary purposes.”

---

### 🔒 Access Control

- Authentication is required for all system access
- Client data is strictly isolated per user
- No cross-client visibility is allowed
- Internal access is restricted to authorized personnel only

---

## 🚫 Prohibited Actions

The following are strictly forbidden:

- Uploading client documents to public AI tools (e.g., ChatGPT UI)
- Storing or retaining client data or summaries
- Training or fine-tuning AI models with client data
- Using third-party tools without verified privacy compliance

---

## ⚖️ Enforcement

Failure to comply with this SOP may result in:

- Disciplinary action
- Legal consequences
- Compliance violations

All personnel must acknowledge and adhere to this procedure when handling client data.

---

## 🛡️ Key Principle

**Zero Retention. Full Privacy. Secure Processing.**

---

## Developer setup (PDF parser)

The app extracts transactions by spawning a local Python script (`parser/parse_statement.py`) via `PYTHON_PATH` (default `python3`).

### Requirements

- Python 3.9+
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) for scanned/image-only PDFs  
  - macOS: `brew install tesseract`
- Node.js dependencies: `npm install`

### Install Python deps

```bash
python3 -m venv parser/.venv
source parser/.venv/bin/activate
pip install -r parser/requirements.txt
```

Point the Next.js app at the venv if needed:

```bash
# .env.local
PYTHON_PATH=/absolute/path/to/statement-ai/parser/.venv/bin/python
```

### CLI smoke test

```bash
parser/.venv/bin/python parser/parse_statement.py path/to/statement.pdf
```

Output shape:

```json
{ "transactions": [{ "id": "...", "date": "YYYY-MM-DD", "description": "...", "amount": -12.34 }] }
```

Positive amounts are credits/income; negative amounts are debits/expenses.

### Supported statement layouts

Layout profiles cover common retail/business checking formats for:

Chase, Bank of America, Wells Fargo, Citibank, U.S. Bank, Capital One, PNC, Truist, TD Bank, plus a generic/regional section-based fallback.

Digital text layers are preferred; sparse/image pages use Tesseract automatically.

### Tests

Place real PDFs in `parser/fixtures/raw/` (gitignored). Synthetic bank text fixtures live in `parser/fixtures/text/`.

```bash
cd parser && .venv/bin/pytest -q
```

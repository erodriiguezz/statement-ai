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

Locally, the app spawns `parser/parse_statement.py`. On Vercel, set `PARSER_SERVICE_URL` to a Render-hosted parser API instead (Python/Tesseract are not available on Vercel).

### Local requirements

- Python 3.9+
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) (`brew install tesseract`)
- `npm install`

```bash
python3 -m venv parser/.venv
source parser/.venv/bin/activate
pip install -r parser/requirements.txt
```

```bash
# .env.local (local only)
PYTHON_PATH=/absolute/path/to/statement-ai/parser/.venv/bin/python
```

### CLI / API smoke tests

```bash
parser/.venv/bin/python parser/parse_statement.py path/to/statement.pdf

# HTTP API (same code Render runs)
cd parser && ../parser/.venv/bin/uvicorn server:app --reload --port 10000
curl -s http://127.0.0.1:10000/health
```

### Deploy parser on Render (for Vercel)

1. Push this repo (includes `parser/Dockerfile` + `render.yaml`).
2. In Render: **New → Blueprint** (or Web Service) → select the repo.
3. Service settings that matter:
   - **Root directory:** `parser`
   - **Runtime:** Docker (`Dockerfile` in `parser/`)
   - **Health check path:** `/health`
4. Copy the generated `PARSER_API_KEY` from Render env vars.
5. After deploy, note the service URL, e.g. `https://statement-ai-parser.onrender.com`.
6. In Vercel project → Settings → Environment Variables:
   - `PARSER_SERVICE_URL` = `https://statement-ai-parser.onrender.com` (no trailing slash)
   - `PARSER_API_KEY` = same value as Render
   - `OPENAI_API_KEY` = your OpenAI key (for Schedule C)
7. Redeploy the Vercel app.

**Cold starts:** Render free tier sleeps. The first parse after idle can take 30–60s; `/api/parse` allows up to 120s.

### Supported statement layouts

Chase, Bank of America, Wells Fargo, Citibank, U.S. Bank, Capital One, PNC, Truist, TD Bank, plus a generic/regional fallback. Scanned PDFs use Tesseract.

### Tests

```bash
cd parser && .venv/bin/pytest -q
```

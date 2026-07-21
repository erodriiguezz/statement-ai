#!/usr/bin/env python3
"""HTTP API for statement PDF parsing (Render / remote workers)."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Dict, Optional

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from extract.ocr import OcrUnavailableError, ocr_status
from extract.pipeline import ParseError, parse_statement

app = FastAPI(title="Statement AI Parser", version="1.0.0")

MAX_UPLOAD_BYTES = int(os.getenv("PARSER_MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
PARSER_API_KEY = os.getenv("PARSER_API_KEY", "").strip()


def require_api_key(
    authorization: Optional[str] = Header(default=None),
) -> None:
    if not PARSER_API_KEY:
        # Open service — fine for private Render URLs; set PARSER_API_KEY in prod.
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token.")
    token = authorization[len("Bearer ") :].strip()
    if token != PARSER_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key.")


@app.get("/health")
def health() -> Dict[str, str]:
    # Keep this tiny — Render free-tier health checks + cold starts.
    return {"status": "ok"}


@app.get("/ready")
def ready() -> Dict[str, object]:
    status = ocr_status()
    return {
        "status": "ok" if status["ocr_ready"] else "degraded",
        "ocr_ready": status["ocr_ready"],
        "tesseract": status["tesseract"],
        "tesseract_cmd": status["tesseract_cmd"],
        "packages_ok": status["packages_ok"],
        "missing_packages": status["missing_packages"],
    }


@app.post("/parse")
async def parse_pdf(
    file: UploadFile = File(...),
    _: None = Depends(require_api_key),
) -> JSONResponse:
    filename = file.filename or "statement.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"PDF exceeds max size ({MAX_UPLOAD_BYTES} bytes).",
        )

    suffix = Path(filename).suffix or ".pdf"
    tmp_path: Optional[Path] = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = Path(tmp.name)

        transactions = parse_statement(tmp_path)
        return JSONResponse({"transactions": transactions})
    except OcrUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if tmp_path is not None and tmp_path.exists():
            tmp_path.unlink()


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "10000"))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)

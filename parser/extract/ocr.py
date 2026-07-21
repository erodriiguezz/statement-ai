"""OCR fallback for scanned / image-only PDF pages."""

from __future__ import annotations

import os
import re
import shutil
from pathlib import Path
from typing import Optional

OCR_DPI = int(os.getenv("OCR_DPI", "200"))
OCR_ZOOM = OCR_DPI / 72.0


class OcrUnavailableError(RuntimeError):
    """Raised when OCR dependencies or Tesseract are unavailable."""


def resolve_tesseract_cmd() -> Optional[str]:
    explicit = os.getenv("TESSERACT_CMD", "").strip()
    if explicit and Path(explicit).exists():
        return explicit

    found = shutil.which("tesseract")
    if found:
        return found

    # Common Linux package paths (Render / Docker)
    for candidate in (
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/bin/tesseract",
    ):
        if Path(candidate).exists():
            return candidate
    return None


def ocr_status() -> dict:
    missing_packages = []
    try:
        import fitz  # noqa: F401
    except ImportError:
        missing_packages.append("pymupdf")
    try:
        import pytesseract  # noqa: F401
    except ImportError:
        missing_packages.append("pytesseract")
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        missing_packages.append("Pillow")

    tesseract_cmd = resolve_tesseract_cmd()
    return {
        "tesseract": bool(tesseract_cmd),
        "tesseract_cmd": tesseract_cmd or "",
        "packages_ok": len(missing_packages) == 0,
        "missing_packages": missing_packages,
        "ocr_ready": bool(tesseract_cmd) and len(missing_packages) == 0,
    }


def ensure_ocr_deps() -> str:
    status = ocr_status()
    if not status["packages_ok"]:
        pkgs = " ".join(status["missing_packages"])
        raise OcrUnavailableError(
            "This PDF appears scanned and requires OCR Python packages. "
            f"Missing: {pkgs}. On Render, deploy the parser with Docker "
            "(parser/Dockerfile), not a plain Python runtime."
        )

    tesseract_cmd = status["tesseract_cmd"]
    if not tesseract_cmd:
        raise OcrUnavailableError(
            "This PDF appears scanned and requires the Tesseract binary. "
            "On Render, use Docker runtime with parser/Dockerfile "
            "(includes tesseract-ocr). Locally: brew install tesseract."
        )

    import pytesseract

    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    return tesseract_cmd


def ocr_page(pdf_path: Path, page_index: int) -> str:
    ensure_ocr_deps()
    import fitz
    import pytesseract
    from PIL import Image

    doc = fitz.open(str(pdf_path))
    try:
        if page_index < 0 or page_index >= doc.page_count:
            return ""
        page = doc.load_page(page_index)
        matrix = fitz.Matrix(OCR_ZOOM, OCR_ZOOM)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        text = pytesseract.image_to_string(image)
        return cleanup_ocr_text(text)
    finally:
        doc.close()


def cleanup_ocr_text(text: str) -> str:
    """Light normalization of common OCR artifacts."""
    replacements = {
        "\u2013": "-",
        "\u2014": "-",
        "\u2212": "-",
        "\xa0": " ",
        "|": " ",
        "Ocr": "OCR",
    }
    cleaned = text
    for src, dest in replacements.items():
        cleaned = cleaned.replace(src, dest)

    cleaned = re.sub(r"\bS(\d{1,3}(?:,\d{3})*\.\d{2})\b", r"$\1", cleaned)
    return cleaned

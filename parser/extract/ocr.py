"""OCR fallback for scanned / image-only PDF pages."""

from __future__ import annotations

import re
import shutil
from pathlib import Path

OCR_DPI = 200
OCR_ZOOM = OCR_DPI / 72.0


class OcrUnavailableError(RuntimeError):
    """Raised when OCR dependencies or Tesseract are unavailable."""


def ensure_ocr_deps() -> None:
    missing: list[str] = []
    try:
        import fitz  # noqa: F401
    except ImportError:
        missing.append("pymupdf")
    try:
        import pytesseract  # noqa: F401
    except ImportError:
        missing.append("pytesseract")
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        missing.append("Pillow")

    if missing:
        pkgs = " ".join(missing)
        raise OcrUnavailableError(
            "This PDF appears scanned and requires OCR packages that are not installed. "
            f"Install them with: pip install {pkgs} "
            "(or: pip install -r parser/requirements.txt). "
            "Also install Tesseract (macOS: brew install tesseract). "
            "If using the Next.js app, set PYTHON_PATH to parser/.venv/bin/python in .env.local."
        )

    if not shutil.which("tesseract"):
        raise OcrUnavailableError(
            "This PDF appears scanned and requires OCR. "
            "Install Tesseract (macOS: brew install tesseract) and retry."
        )


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

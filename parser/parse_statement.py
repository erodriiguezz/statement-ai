#!/usr/bin/env python3
"""CLI: extract transactions from a bank statement PDF."""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow running as `python parser/parse_statement.py` without installing package.
PARSER_DIR = Path(__file__).resolve().parent
if str(PARSER_DIR) not in sys.path:
    sys.path.insert(0, str(PARSER_DIR))

from extract.ocr import OcrUnavailableError  # noqa: E402
from extract.pipeline import ParseError, parse_statement  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        print(json.dumps({"error": "Usage: parse_statement.py <pdf_path> [--profile=<id>]"}))
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    profile_id = None
    if len(sys.argv) == 3 and sys.argv[2].startswith("--profile="):
        profile_id = sys.argv[2].split("=", 1)[1].strip() or None

    try:
        transactions = parse_statement(pdf_path, profile_id=profile_id)
        print(json.dumps({"transactions": transactions}))
    except (ParseError, OcrUnavailableError) as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()

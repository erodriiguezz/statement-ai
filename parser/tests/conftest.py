from __future__ import annotations

import sys
from pathlib import Path

PARSER_ROOT = Path(__file__).resolve().parents[1]
if str(PARSER_ROOT) not in sys.path:
    sys.path.insert(0, str(PARSER_ROOT))

FIXTURES = PARSER_ROOT / "fixtures"
RAW_PDFS = FIXTURES / "raw"
TEXT_FIXTURES = FIXTURES / "text"
EXPECTED = FIXTURES / "expected"

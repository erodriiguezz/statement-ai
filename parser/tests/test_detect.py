from __future__ import annotations

from extract.detect import _looks_shattered


def test_shattered_text_is_detected():
    # Fixed-pitch fonts make pdfplumber split every glyph into its own token.
    shattered = "1 / 0 3 X X S O C S E C S S A T R E A S 3 1 0 4 2 2 . 0 0"
    assert _looks_shattered(shattered)


def test_normal_text_is_not_shattered():
    normal = (
        "1/03 XXSOC SEC SSA TREAS 310 422.00 "
        "DBT CRD 2043 12/29/22 BG2FV84 SHELL OIL 575278852QPS"
    )
    assert not _looks_shattered(normal)


def test_short_text_is_not_flagged():
    # Too few tokens to judge; avoid false positives on sparse pages.
    assert not _looks_shattered("A B C D")

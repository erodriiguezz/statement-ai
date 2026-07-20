"""Fingerprint bank identity from statement text."""

from __future__ import annotations

from .profiles import GENERIC, PROFILES, LayoutProfile, get_profile


def detect_bank(text: str) -> LayoutProfile:
    """Return the best matching layout profile for statement text."""
    sample = text[:8000].lower()
    best: LayoutProfile | None = None
    best_hits = 0

    for profile in PROFILES:
        if profile.id == GENERIC.id:
            continue
        hits = sum(1 for keyword in profile.match_keywords if keyword in sample)
        if hits > best_hits:
            best = profile
            best_hits = hits

    return best if best_hits > 0 else GENERIC


def detect_bank_id(text: str) -> str:
    return detect_bank(text).id


def resolve_profile(profile_id: str | None = None, text: str = "") -> LayoutProfile:
    if profile_id:
        return get_profile(profile_id)
    if text:
        return detect_bank(text)
    return GENERIC

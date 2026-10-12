---
version: 0.1.0
last_release: none
updated: 2026-10-11
---

# Lessons

What past work taught us. `/plan` reads the **Active** table before asking questions. `/release` adds rows from each change's plan Retro. A lesson seen twice becomes a proposed rule, skill or fixture change in a `process` PR that a human approves. Agents never change rules directly.

## Active
| ID | Lesson | Seen in | Times | Proposed change | Status |
| --- | --- | --- | --- | --- | --- |
| L1 | Synthetic fixtures written from an idealized layout (one amount per row, a header on every section, a recognized period line) pass while real statements fail; check new layouts against real statement text (redacted) before trusting green tests | PRs #1–#3, 2026-10 parser investigation | 1 | Require a redacted real-layout text fixture for every parser fix | watching |

Status: `watching` (seen once) · `proposed` (process PR open) · `adopted` (merged; link it) · `dropped` (reason).

## Revision history
| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-11 | Seeded |

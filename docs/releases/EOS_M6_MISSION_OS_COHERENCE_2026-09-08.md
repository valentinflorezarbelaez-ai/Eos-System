# EOS M6 Mission OS dual-FSM coherence - 2026-09-08

**Branch:** `cursor/eos-m6-mission-os-coherence`
**Base main tip:** `112bb2d` (M5 #43 merged)
**Scope:** M6 ONLY (Ladder 2 G6) — LAST of Ladder 2 — EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)

## Goal (G6 / M6 DoD)

ADR-0014: mission loop is MCP overlay — does not replace ATS / Mission OS FSM.
Ship a single operator map ATS stages to mission-loop stages in HUD/docs.
No second FSM invented. No mass prune of src/core (default skip; no PO-named dead island).

## Deliverables

1. docs/orchestration/MISSION_OS_ATS_MISSION_LOOP_COHERENCE.md
2. src/core/observability/mission-os-coherence.js (exports map for HUD)
3. Operator HUD exposes mission_os_coherence section/field without claiming one FSM replaced the other
4. TDD: map completeness + HUD includes map — tests/eos-m6-mission-os-coherence.test.js / test:m6
5. This release note + freeze note that Ladder 2 M1-M6 complete after this merges
6. Dirty unstaged DEFERRED (unchanged)
7. G7 (EVD paths skipping custody) noted as deferred next gap — not implemented here

## Verify

See package script test:m6 and verify:strict.

## Non-claims

- No App Fuerza. No Fundacion mutation.
- No second FSM. No mass src/core prune.
- No G7 custody inventory in this branch.
- push + compare only; do not merge without PO.
- PRODUCTION_READY remains NO.
- Ladder 2 M1-M6 marked complete only after this PR merges.
# ADR-0080 — Mission CZ Ladder 28 CI Seam-Pack Consolidation & Closeout

- **Status:** Accepted — local governed (Ladder 28 Seam / Closeout)
- **Date:** 2026-09-21
- **Deciders:** EOS local governed use (Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric)
- **Spec:** SPEC-0109

## Context

Ladder 28 satellites CV–CY are MEASURED (CV #390, CW #392, CX #394, CY #396 on tip `900b14e4`). Without a fail-closed CI seam-pack and formal closeout, Ladder 28 remains OPEN and cannot seal `CLOSED_FOR_LOCAL_GOVERNED_USE`.

Mission CZ delivers:
1. Hermetic `tests/eos-ladder28-seam-pack.test.js` unifying CV→CW→CX→CY smoke, receipt prefixes (CV-RCPT/CW-RCPT/CX-RCPT/CY-RCPT), Fundacion deny surfaces, closeout honesty, Law VI, NON-CLAIMs.
2. Host wiring via `scripts/patch-mission-cz.mjs` (`test:ladder28-seam`, `test:ladder28-pack`, `test:mission-cz`, SLIM exclude for seam).
3. Formal closeout audit `docs/releases/EOS_LADDER_28_CLOSEOUT_2026-09-21.md`.
4. OpenSpec change `openspec/changes/eos-ladder-28-mission-cz/`.

## Decision

1. Mirror Ladder 27 / Mission CU seam-pack pattern (fail-closed Layer-0; seam in `SLIM_SUITE_EXCLUDES`).
2. Do **not** implement new product ports — CV/CW/CX/CY already MEASURED.
3. Do **not** rewrite freeze/matrix/dirty-defer tip pins in this mission (SEPARATE tip seal after CZ merge; parent tip-refresh). Freeze package pin note remains `900b14e4` (CY MEASURED) until post-CZ tip-seal.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Seam-pack ≠ GitHub Enterprise enforcement, `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`, schemas AT_CEILING, ≠ reopen L27.
5. Never reopen L17–L27. After CZ closeout tip-seal, never reopen L28.

## Alternatives considered AND REJECTED

### A. Claiming GitHub Enterprise enforcement via seam-pack
**Rejected.** Seam-pack is local CI composition only.

### B. Flipping PRODUCTION_READY with closeout
**Rejected.** Closeout seals local governed use only.

### C. Tip-refresh / freeze tip rewrite inside this mission
**Rejected.** Parent applies tip seal AFTER CZ merge (separate tip-refresh).

### D. Adding new docs/schemas JSON
**Rejected.** Schemas remain AT_CEILING 35/35.

### E. Reopening L27
**Rejected.** L17–L27 CLOSED never reopen.

## Consequences

- **Positive:** Fail-closed CV–CY CI pack; formal L28 closeout; honesty seals preserved.
- **Negative:** Seal is local governed — not production readiness.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI; L17–L27 never reopen; L28 never reopen after closeout; schemas AT_CEILING.

# ADR-0073 — Mission CU Ladder 27 CI Seam-Pack Consolidation & Closeout

- **Status:** Accepted — local governed (Ladder 27 Seam / Closeout)
- **Date:** 2026-09-19
- **Deciders:** EOS local governed use (Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric)
- **Spec:** SPEC-0104

## Context

Ladder 27 satellites CQ–CT are MEASURED (CQ #377, CR #379, CS #380, CT #382 on tip `1d675074`). Without a fail-closed CI seam-pack and formal closeout, Ladder 27 remains OPEN and cannot seal `CLOSED_FOR_LOCAL_GOVERNED_USE`.

Mission CU delivers:
1. Hermetic `tests/eos-ladder27-seam-pack.test.js` unifying CQ→CR→CS→CT smoke, receipt prefixes (CQ-RCPT/CR-RCPT/CS-RCPT/CT-RCPT), Fundacion deny surfaces, closeout honesty, Law VI, NON-CLAIMs.
2. Host wiring via `scripts/patch-mission-cu.mjs` (`test:ladder27-seam`, `test:ladder27-pack`, `test:mission-cu`, SLIM exclude for seam).
3. Formal closeout audit `docs/releases/EOS_LADDER_27_CLOSEOUT_2026-09-19.md`.
4. OpenSpec change `openspec/changes/eos-ladder-27-mission-cu/`.

## Decision

1. Mirror Ladder 26 / Mission CP seam-pack pattern (fail-closed Layer-0; seam in `SLIM_SUITE_EXCLUDES`).
2. Do **not** implement new product ports — CQ/CR/CS/CT already MEASURED.
3. Do **not** rewrite freeze/matrix/dirty-defer/m4 tip pins in this mission (SEPARATE tip seal after CU merge; parent tip-refresh).
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Seam-pack ≠ GitHub Enterprise enforcement, `CLOSED_FOR_LOCAL_GOVERNED_USE` ≠ `PRODUCTION_READY=YES`, schemas AT_CEILING.
5. Never reopen L17–L26. After CU closeout, never reopen L27.

## Alternatives considered AND REJECTED

### A. Claiming GitHub Enterprise enforcement via seam-pack
**Rejected.** Seam-pack is local CI composition only.

### B. Flipping PRODUCTION_READY with closeout
**Rejected.** Closeout seals local governed use only.

### C. Tip-refresh / freeze tip rewrite inside this mission
**Rejected.** Parent applies tip seal AFTER CU merge (separate tip-refresh).

### D. Adding new docs/schemas JSON
**Rejected.** Schemas remain AT_CEILING 35/35.

## Consequences

- **Positive:** Fail-closed CQ–CT CI pack; formal L27 closeout; honesty seals preserved.
- **Negative:** Seal is local governed — not production readiness.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI; L17–L26 never reopen; L27 never reopen after closeout; schemas AT_CEILING.

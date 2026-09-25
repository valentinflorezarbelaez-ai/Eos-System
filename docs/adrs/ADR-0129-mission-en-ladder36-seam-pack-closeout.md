# ADR-0129 — Mission EN Ladder 36 CI Seam-Pack Consolidation & Closeout

- **Status:** Accepted — local governed (Ladder 36 Seam / Closeout satellite)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Resource Isolation, Admission Control & Backpressure Fabric)
- **Spec:** SPEC-0150
- **Prior ADRs:** ADR-0128 (EM), ADR-0127 (EL), ADR-0126 (EK), ADR-0125 (EJ), ADR-0124 (L36 Audit), ADR-0123 (EI L35 Seam)

## Context

Ladder 36 satellites EJ–EM are MEASURED on host/main (soft-observe pin `9fd2be07` from PR #497 / commit `9fd2be07` Mission EM merge tip). Without a fail-closed CI seam-pack, Ladder 36 cannot proceed to tip-seal. Formal L30–L35 remain CLOSED (never reopen). **Ladder 36 remains OPEN** until a SEPARATE tip-refresh + tip-seal after EN merge — this package is the product/seam closeout satellite only.

Mission EN delivers:
1. Hermetic `tests/eos-en-ladder36-seam-pack.test.js` unifying soft-import EJ→EK→EL→EM smoke, receipt prefixes (EJ-RCPT/EK-RCPT/EL-RCPT/EM-RCPT), EN-RCPT-* seal, Fundacion/tip-rewrite/L36-auto-close/tip-seal-in-product/schema-json/PRODUCTION_READY/L30–L35 reopen DENY surfaces, closeout honesty, Law VI, NON-CLAIMs.
2. Thin fail-closed `ladder36-seam-*` triad for EN-RCPT sealing only — does **not** overwrite EJ/EK/EL/EM product modules.
3. Host wiring via `scripts/patch-mission-en.mjs` (`test:ladder36-seam`, `test:ladder36-pack`, `test:mission-en`, SLIM exclude for seam).
4. Closeout proposal `docs/releases/EOS_LADDER_36_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md` — proposes readiness; does **not** Formal-close L36.
5. OpenSpec change `openspec/changes/eos-ladder-36-mission-en/`.

## Decision

1. Mirror Ladder 35 / Mission EI seam-pack pattern (fail-closed Layer-0; seam in `SLIM_SUITE_EXCLUDES`).
2. Soft-import EJ/EK/EL/EM when present; soft-fail safe; tests accept observed true|false. Do **not** re-implement or overwrite product ports.
3. Do **not** rewrite freeze/matrix/dirty-defer tip pins in this mission (SEPARATE tip-refresh then tip-seal after EN merge). Soft-observe pin note remains `9fd2be07` (NON-CLAIM only).
4. Do **not** tip-seal L36 CLOSED in this package — tip-seal is SEPARATE after EN merge + tip-refresh. Closeout ≠ tip-seal ≠ Formal L36 CLOSED.
5. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Seam-pack ≠ GitHub Enterprise enforcement, schemas AT_CEILING 35/35, ≠ reopen L30–L35, ≠ tip-seal-in-product claim, ≠ schema-json add.
6. Never reopen L30–L35. Refuse unsupervised L36 auto-close without `humanGateHeld`.
7. PASS = hermetic seam chain EJ→EK→EL→EM verified ≠ tip-seal ≠ PRODUCTION_READY ≠ Formal L36 CLOSED.
8. Hermetic only: no live metrics/OS monitors; inject observed state like EJ–EM.

## Alternatives considered AND REJECTED

### A. Claiming GitHub Enterprise enforcement via seam-pack
**Rejected.** Seam-pack is local CI composition only.

### B. Flipping PRODUCTION_READY with closeout
**Rejected.** Closeout satellite seals local governed seam verify only.

### C. Tip-refresh / freeze tip rewrite / tip-seal L36 CLOSED inside this mission
**Rejected.** Tip-refresh post-EN then tip-seal L36 are SEPARATE next steps. Soft-observe pin is NON-CLAIM only.

### D. Adding new docs/schemas JSON
**Rejected.** Schemas remain AT_CEILING 35/35.

### E. Reopening L30 / L31 / L32 / L33 / L34 / L35
**Rejected.** L30–L35 CLOSED never reopen.

### F. Overwriting EJ/EK/EL/EM product modules from this package
**Rejected.** Soft-import only; hermetic companions for seam verify are the thin `ladder36-seam-*` triad only.

### G. Claiming Formal L36 CLOSED in the product PR
**Rejected.** tipSealInProduct / Formal L36 CLOSED refused — tip-seal later.

## Consequences

- **Positive:** Fail-closed EJ–EM CI pack; EN-RCPT-* chain seal; honesty seals preserved; L36 ready for SEPARATE tip-refresh + tip-seal.
- **Negative:** Seal is local governed seam verify — not production readiness; Formal L36 CLOSED still requires separate tip-seal.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI; L30–L35 never reopen; L36 remains OPEN until tip-seal; schemas AT_CEILING 35/35; tip-seal SEPARATE.

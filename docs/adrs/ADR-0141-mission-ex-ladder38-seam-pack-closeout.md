# ADR-0141 — Mission EX Ladder 38 CI Seam-Pack Consolidation & Closeout

- **Status:** Accepted — local governed (Ladder 38 Seam / Closeout satellite)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Credential-Handle & Secret-Zero Governance Fabric)
- **Spec:** SPEC-0160
- **Prior ADRs:** ADR-0140 (EW), ADR-0139 (EV), ADR-0138 (EU), ADR-0137 (ET), ADR-0136 (L38 Audit), ADR-0135 (ES L37 Seam)

## Context

Ladder 38 satellites ET–EW are MEASURED on host/main (soft-observe pin `b09467a2` from EW merge #527 / tip-refresh #528). Without a fail-closed CI seam-pack, Ladder 38 cannot proceed to tip-seal. Formal L30–L37 remain CLOSED (never reopen). **Ladder 38 remains OPEN** until a SEPARATE tip-refresh + tip-seal after EX merge — this package is the product/seam closeout satellite only. Distinct from ES L37 seam, EN L36 seam, EI L35 seam, and AU secrets runtime.

Mission EX delivers:
1. Hermetic `tests/eos-ex-ladder38-seam-pack.test.js` unifying soft-import ET→EU→EV→EW smoke, receipt prefixes (ET-RCPT/EU-RCPT/EV-RCPT/EW-RCPT), EX-RCPT-* seal, Fundacion/tip-rewrite/L38-auto-close/tip-seal-in-product/schema-json/PRODUCTION_READY/L30–L37 reopen/AU-secrets-runtime DENY surfaces, closeout honesty, Law VI, NON-CLAIMs.
2. Thin fail-closed `ladder38-seam-*` triad for EX-RCPT sealing only — does **not** overwrite ET/EU/EV/EW product modules.
3. Host wiring via `scripts/patch-mission-ex.mjs` (`test:ladder38-seam`, `test:ladder38-pack`, `test:mission-ex`, SLIM exclude for seam).
4. Closeout proposal `docs/releases/EOS_LADDER_38_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md` — proposes readiness; does **not** Formal-close L38.
5. OpenSpec change `openspec/changes/eos-ladder-38-mission-ex/`.

## Decision

1. Mirror Ladder 37 / Mission ES seam-pack pattern (fail-closed Layer-0; seam in `SLIM_SUITE_EXCLUDES`).
2. Soft-import ET/EU/EV/EW when present; soft-fail safe; tests accept observed true|false. Do **not** re-implement or overwrite product ports.
3. Do **not** rewrite freeze/matrix/dirty-defer tip pins in this mission (SEPARATE tip-refresh then tip-seal after EX merge). Soft-observe pin note remains `b09467a2` (NON-CLAIM only).
4. Do **not** tip-seal L38 CLOSED in this package — tip-seal is SEPARATE after EX merge + tip-refresh. Closeout ≠ tip-seal ≠ Formal L38 CLOSED.
5. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Seam-pack ≠ GitHub Enterprise enforcement, schemas AT_CEILING, ≠ reopen L30–L37, ≠ tip-seal-in-product claim, ≠ schema-json add, ≠ AU secrets runtime reopen.
6. Never reopen L30–L37. Refuse unsupervised L38 auto-close without `humanGateHeld`.
7. PASS = hermetic seam chain ET→EU→EV→EW verified ≠ tip-seal ≠ PRODUCTION_READY ≠ Formal L38 CLOSED.
8. Hermetic only: no live secret store / remote vault; inject observed state like ET–EW. Law VI — opaque digests/handles only.
9. Distinct from ES L37 seam, EN L36 seam, EI L35 seam, and AU secrets runtime.

## Alternatives considered AND REJECTED

### A. Claiming GitHub Enterprise enforcement via seam-pack
**Rejected.** Seam-pack is local CI composition only.

### B. Flipping PRODUCTION_READY with closeout
**Rejected.** Closeout satellite seals local governed seam verify only.

### C. Tip-refresh / freeze tip rewrite / tip-seal L38 CLOSED inside this mission
**Rejected.** Tip-refresh post-EX then tip-seal L38 are SEPARATE next steps. Soft-observe pin is NON-CLAIM only.

### D. Adding new docs/schemas JSON
**Rejected.** Schemas remain AT_CEILING 35/35.

### E. Reopening L30 / L31 / L32 / L33 / L34 / L35 / L36 / L37
**Rejected.** L30–L37 CLOSED never reopen.

### F. Overwriting ET/EU/EV/EW product modules from this package
**Rejected.** Soft-import only; hermetic companions for seam verify are the thin `ladder38-seam-*` triad only.

### G. Claiming Formal L38 CLOSED in the product PR
**Rejected.** tipSealInProduct / Formal L38 CLOSED refused — tip-seal later.

### H. Reopening AU secrets runtime / sealing live secret material
**Rejected.** Law VI — hermetic opaque handles/digests only.

## Consequences

- **Positive:** Fail-closed ET–EW CI pack; EX-RCPT-* chain seal; honesty seals preserved; L38 ready for SEPARATE tip-refresh + tip-seal.
- **Negative:** Seal is local governed seam verify — not production readiness; Formal L38 CLOSED still requires separate tip-seal.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI; L30–L37 never reopen; L38 remains OPEN until tip-seal; schemas AT_CEILING; tip-seal SEPARATE.

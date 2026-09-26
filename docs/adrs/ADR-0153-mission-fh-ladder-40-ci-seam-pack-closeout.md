# ADR-0153 — Mission FH Ladder 40 CI Seam-Pack Consolidation & Closeout

- **Status:** Accepted — local governed (Ladder 40 Seam / Closeout satellite)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Outbound Delivery & Callback Authenticity Governance Fabric)
- **Spec:** SPEC-0170
- **Prior ADRs:** ADR-0152 (FG), ADR-0151 (FF), ADR-0150 (FE), ADR-0149 (FD), ADR-0148 (L40 Audit), ADR-0147 (FC L39 Seam)

## Context

Ladder 40 satellites FD–FG are MEASURED on host/main (soft-observe pin `1376ac54` from FG merge #557 / tip-refresh #558). Without a fail-closed CI seam-pack, Ladder 40 cannot proceed to tip-seal. Formal L30–L39 remain CLOSED (never reopen). **Ladder 40 remains OPEN** until a SEPARATE tip-refresh + tip-seal after FH merge — this package is the product/seam closeout satellite only. Distinct from FC L39 seam (inbound), EX L38 seam, ES L37 seam, EN L36 seam, EI L35 seam, and AU secrets runtime. Symmetric to Mission FC (SPEC-0165 / PR #544): FC closed L39 ingress fabric; FH closes L40 outbound delivery fabric.

Mission FH delivers:
1. Hermetic `tests/eos-fh-ladder40-seam-pack.test.js` unifying soft-import FD→FE→FF→FG smoke, receipt prefixes (FD-RCPT/FE-RCPT/FF-RCPT/FG-RCPT), FH-RCPT-* seal, Fundacion/tip-rewrite/L40-auto-close/tip-seal-in-product/schema-json/PRODUCTION_READY/L30–L39 reopen/AU-secrets-runtime DENY surfaces, closeout honesty, Law VI, NON-CLAIMs.
2. Thin fail-closed `ladder40-seam-*` triad for FH-RCPT sealing only — does **not** overwrite FD/FE/FF/FG product modules.
3. Host wiring via `scripts/patch-mission-fh.mjs` (`test:ladder40-seam`, `test:ladder40-pack`, `test:mission-fh`, SLIM exclude for seam).
4. Closeout proposal `docs/releases/EOS_LADDER_40_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md` — proposes readiness; does **not** Formal-close L40.
5. OpenSpec change `openspec/changes/eos-ladder-40-mission-fh/`.

## Decision

1. Mirror Ladder 39 / Mission FC seam-pack pattern (fail-closed Layer-0; seam in `SLIM_SUITE_EXCLUDES`).
2. Soft-import FD/FE/FF/FG when present; soft-fail safe; tests accept observed true|false. Do **not** re-implement or overwrite product ports.
3. Do **not** rewrite freeze/matrix/dirty-defer tip pins in this mission (SEPARATE tip-refresh then tip-seal after FH merge). Soft-observe pin note remains `1376ac54` (NON-CLAIM only).
4. Do **not** tip-seal L40 CLOSED in this package — tip-seal is SEPARATE after FH merge + tip-refresh. Closeout ≠ tip-seal ≠ Formal L40 CLOSED.
5. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Seam-pack ≠ GitHub Enterprise enforcement, schemas AT_CEILING, ≠ reopen L30–L39, ≠ tip-seal-in-product claim, ≠ schema-json add, ≠ AU secrets runtime reopen.
6. Never reopen L30–L39. Refuse unsupervised L40 auto-close without `humanGateHeld`.
7. PASS = hermetic seam chain FD→FE→FF→FG verified ≠ tip-seal ≠ PRODUCTION_READY ≠ Formal L40 CLOSED.
8. Hermetic only: no live HTTP egress / tip-refresh / tip-seal / PRODUCTION_READY flip; inject observed state like FD–FG. Law VI — opaque digests/handles only.
9. Distinct from FC L39 seam, EX L38 seam, ES L37 seam, EN L36 seam, EI L35 seam, AU secrets runtime, Canary, Fundacion, and `src/core/delivery/`.

## Alternatives considered AND REJECTED

### A. Claiming GitHub Enterprise enforcement via seam-pack
**Rejected.** Seam-pack is local CI composition only.

### B. Flipping PRODUCTION_READY with closeout
**Rejected.** Closeout satellite seals local governed seam verify only.

### C. Tip-refresh / freeze tip rewrite / tip-seal L40 CLOSED inside this mission
**Rejected.** Tip-refresh post-FH then tip-seal L40 are SEPARATE next steps. Soft-observe pin is NON-CLAIM only.

### D. Adding new docs/schemas JSON
**Rejected.** Schemas remain AT_CEILING 35/35.

### E. Reopening L30 / L31 / L32 / L33 / L34 / L35 / L36 / L37 / L38 / L39
**Rejected.** L30–L39 CLOSED never reopen.

### F. Overwriting FD/FE/FF/FG product modules from this package
**Rejected.** Soft-import only; hermetic companions for seam verify are the thin `ladder40-seam-*` triad only.

### G. Claiming Formal L40 CLOSED in the product PR
**Rejected.** tipSealInProduct / Formal L40 CLOSED refused — tip-seal later.

### H. Reopening AU secrets runtime / sealing live secret material
**Rejected.** Law VI — hermetic opaque handles/digests only.

## Consequences

- **Positive:** Fail-closed FD–FG CI pack; FH-RCPT-* chain seal; honesty seals preserved; L40 ready for SEPARATE tip-refresh + tip-seal.
- **Negative:** Seal is local governed seam verify — not production readiness; Formal L40 CLOSED still requires separate tip-seal.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI; L30–L39 never reopen; L40 remains OPEN until tip-seal; schemas AT_CEILING; tip-seal SEPARATE.

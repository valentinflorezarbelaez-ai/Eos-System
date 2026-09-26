# ADR-0147 — Mission FC Ladder 39 CI Seam-Pack Consolidation & Closeout

- **Status:** Accepted — local governed (Ladder 39 Seam / Closeout satellite)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign External Event Ingress & Webhook Authenticity Governance Fabric)
- **Spec:** SPEC-0165
- **Prior ADRs:** ADR-0146 (FB), ADR-0145 (FA), ADR-0144 (EZ), ADR-0143 (EY), ADR-0142 (L39 Audit), ADR-0141 (EX L38 Seam)

## Context

Ladder 39 satellites EY–FB are MEASURED on host/main (soft-observe pin `d1041230` from FB merge #542 / tip-refresh #543). Without a fail-closed CI seam-pack, Ladder 39 cannot proceed to tip-seal. Formal L30–L38 remain CLOSED (never reopen). **Ladder 39 remains OPEN** until a SEPARATE tip-refresh + tip-seal after FC merge — this package is the product/seam closeout satellite only. Distinct from EX L38 seam, ES L37 seam, EN L36 seam, EI L35 seam, and AU secrets runtime.

Mission FC delivers:
1. Hermetic `tests/eos-fc-ladder39-seam-pack.test.js` unifying soft-import EY→EZ→FA→FB smoke, receipt prefixes (EY-RCPT/EZ-RCPT/FA-RCPT/FB-RCPT), FC-RCPT-* seal, Fundacion/tip-rewrite/L39-auto-close/tip-seal-in-product/schema-json/PRODUCTION_READY/L30–L38 reopen/AU-secrets-runtime DENY surfaces, closeout honesty, Law VI, NON-CLAIMs.
2. Thin fail-closed `ladder39-seam-*` triad for FC-RCPT sealing only — does **not** overwrite EY/EZ/FA/FB product modules.
3. Host wiring via `scripts/patch-mission-fc.mjs` (`test:ladder39-seam`, `test:ladder39-pack`, `test:mission-fc`, SLIM exclude for seam).
4. Closeout proposal `docs/releases/EOS_LADDER_39_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md` — proposes readiness; does **not** Formal-close L39.
5. OpenSpec change `openspec/changes/eos-ladder-39-mission-fc/`.

## Decision

1. Mirror Ladder 38 / Mission EX seam-pack pattern (fail-closed Layer-0; seam in `SLIM_SUITE_EXCLUDES`).
2. Soft-import EY/EZ/FA/FB when present; soft-fail safe; tests accept observed true|false. Do **not** re-implement or overwrite product ports.
3. Do **not** rewrite freeze/matrix/dirty-defer tip pins in this mission (SEPARATE tip-refresh then tip-seal after FC merge). Soft-observe pin note remains `d1041230` (NON-CLAIM only).
4. Do **not** tip-seal L39 CLOSED in this package — tip-seal is SEPARATE after FC merge + tip-refresh. Closeout ≠ tip-seal ≠ Formal L39 CLOSED.
5. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Seam-pack ≠ GitHub Enterprise enforcement, schemas AT_CEILING, ≠ reopen L30–L38, ≠ tip-seal-in-product claim, ≠ schema-json add, ≠ AU secrets runtime reopen.
6. Never reopen L30–L38. Refuse unsupervised L39 auto-close without `humanGateHeld`.
7. PASS = hermetic seam chain EY→EZ→FA→FB verified ≠ tip-seal ≠ PRODUCTION_READY ≠ Formal L39 CLOSED.
8. Hermetic only: no live ingress mutation / live webhook endpoint / remote vault; inject observed state like EY–FB. Law VI — opaque digests/handles only.
9. Distinct from EX L38 seam, ES L37 seam, EN L36 seam, EI L35 seam, and AU secrets runtime.

## Alternatives considered AND REJECTED

### A. Claiming GitHub Enterprise enforcement via seam-pack
**Rejected.** Seam-pack is local CI composition only.

### B. Flipping PRODUCTION_READY with closeout
**Rejected.** Closeout satellite seals local governed seam verify only.

### C. Tip-refresh / freeze tip rewrite / tip-seal L39 CLOSED inside this mission
**Rejected.** Tip-refresh post-FC then tip-seal L39 are SEPARATE next steps. Soft-observe pin is NON-CLAIM only.

### D. Adding new docs/schemas JSON
**Rejected.** Schemas remain AT_CEILING 35/35.

### E. Reopening L30 / L31 / L32 / L33 / L34 / L35 / L36 / L37 / L38
**Rejected.** L30–L38 CLOSED never reopen.

### F. Overwriting EY/EZ/FA/FB product modules from this package
**Rejected.** Soft-import only; hermetic companions for seam verify are the thin `ladder39-seam-*` triad only.

### G. Claiming Formal L39 CLOSED in the product PR
**Rejected.** tipSealInProduct / Formal L39 CLOSED refused — tip-seal later.

### H. Reopening AU secrets runtime / sealing live secret material
**Rejected.** Law VI — hermetic opaque handles/digests only.

## Consequences

- **Positive:** Fail-closed EY–FB CI pack; FC-RCPT-* chain seal; honesty seals preserved; L39 ready for SEPARATE tip-refresh + tip-seal.
- **Negative:** Seal is local governed seam verify — not production readiness; Formal L39 CLOSED still requires separate tip-seal.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI; L30–L38 never reopen; L39 remains OPEN until tip-seal; schemas AT_CEILING; tip-seal SEPARATE.

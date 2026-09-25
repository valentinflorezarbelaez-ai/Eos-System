# ADR-0123 — Mission EI Ladder 35 CI Seam-Pack Consolidation & Closeout

- **Status:** Accepted — local governed (Ladder 35 Seam / Closeout satellite)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Temporal Honesty & Deadline Fabric)
- **Spec:** SPEC-0145
- **Prior ADRs:** ADR-0122 (EH), ADR-0121 (EG), ADR-0120 (EF), ADR-0119 (EE), ADR-0118 (L35 Audit), ADR-0117 (ED L34 Seam)

## Context

Ladder 35 satellites EE–EH are MEASURED on host/main (soft-observe pin `bdd53e30` from tip-refresh-post-482 / PR #483 Mission EH merge tip). Without a fail-closed CI seam-pack, Ladder 35 cannot proceed to tip-seal. Formal L30–L34 remain CLOSED (never reopen). **Ladder 35 remains OPEN** until a SEPARATE tip-refresh + tip-seal after EI merge — this package is the product/seam closeout satellite only.

Mission EI delivers:
1. Hermetic `tests/eos-ei-ladder35-seam-pack.test.js` unifying soft-import EE→EF→EG→EH smoke, receipt prefixes (EE-RCPT/EF-RCPT/EG-RCPT/EH-RCPT), EI-RCPT-* seal, Fundacion/tip-rewrite/L35-auto-close/tip-seal-in-product/schema-json/PRODUCTION_READY/L30–L34 reopen DENY surfaces, closeout honesty, Law VI, NON-CLAIMs.
2. Thin fail-closed `ladder35-seam-*` triad for EI-RCPT sealing only — does **not** overwrite EE/EF/EG/EH product modules.
3. Host wiring via `scripts/patch-mission-ei.mjs` (`test:ladder35-seam`, `test:ladder35-pack`, `test:mission-ei`, SLIM exclude for seam).
4. Closeout proposal `docs/releases/EOS_LADDER_35_SEAM_PACK_CLOSEOUT_PROPOSAL_2026-09-25.md` — proposes readiness; does **not** Formal-close L35.
5. OpenSpec change `openspec/changes/eos-ladder-35-mission-ei/`.

## Decision

1. Mirror Ladder 34 / Mission ED seam-pack pattern (fail-closed Layer-0; seam in `SLIM_SUITE_EXCLUDES`).
2. Soft-import EE/EF/EG/EH when present; soft-fail safe; tests accept observed true|false. Do **not** re-implement or overwrite product ports.
3. Do **not** rewrite freeze/matrix/dirty-defer tip pins in this mission (SEPARATE tip-refresh then tip-seal after EI merge). Soft-observe pin note remains `bdd53e30` (NON-CLAIM only).
4. Do **not** tip-seal L35 CLOSED in this package — tip-seal is SEPARATE after EI merge + tip-refresh. Closeout ≠ tip-seal ≠ Formal L35 CLOSED.
5. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Seam-pack ≠ GitHub Enterprise enforcement, schemas AT_CEILING, ≠ reopen L30–L34, ≠ tip-seal-in-product claim, ≠ schema-json add.
6. Never reopen L30–L34. Refuse unsupervised L35 auto-close without `humanGateHeld`.
7. PASS = hermetic seam chain EE→EF→EG→EH verified ≠ tip-seal ≠ PRODUCTION_READY ≠ Formal L35 CLOSED.
8. Hermetic only: no live timers/cron/OS scheduler; inject observed state like EE–EH.

## Alternatives considered AND REJECTED

### A. Claiming GitHub Enterprise enforcement via seam-pack
**Rejected.** Seam-pack is local CI composition only.

### B. Flipping PRODUCTION_READY with closeout
**Rejected.** Closeout satellite seals local governed seam verify only.

### C. Tip-refresh / freeze tip rewrite / tip-seal L35 CLOSED inside this mission
**Rejected.** Tip-refresh post-EI then tip-seal L35 are SEPARATE next steps. Soft-observe pin is NON-CLAIM only.

### D. Adding new docs/schemas JSON
**Rejected.** Schemas remain AT_CEILING 35/35.

### E. Reopening L30 / L31 / L32 / L33 / L34
**Rejected.** L30–L34 CLOSED never reopen.

### F. Overwriting EE/EF/EG/EH product modules from this package
**Rejected.** Soft-import only; hermetic companions for seam verify are the thin `ladder35-seam-*` triad only.

### G. Claiming Formal L35 CLOSED in the product PR
**Rejected.** tipSealInProduct / Formal L35 CLOSED refused — tip-seal later.

## Consequences

- **Positive:** Fail-closed EE–EH CI pack; EI-RCPT-* chain seal; honesty seals preserved; L35 ready for SEPARATE tip-refresh + tip-seal.
- **Negative:** Seal is local governed seam verify — not production readiness; Formal L35 CLOSED still requires separate tip-seal.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI; L30–L34 never reopen; L35 remains OPEN until tip-seal; schemas AT_CEILING; tip-seal SEPARATE.

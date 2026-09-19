# ADR-0071 — Mission CS SpecBoot Operator Continuity Port

- **Status:** Accepted — local governed (Ladder 27 Satellite 3)
- **Date:** 2026-09-19
- **Deciders:** EOS local governed use (Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric)
- **Spec:** SPEC-0102

## Context

Post-L26 Workstream E delivered `specboot-friction-gate.js` (fail-closed LIDR probes + A6/A7 human gates) but EOS lacked a Layer-0 **operator continuity port** with sealed receipts (`CS-RCPT-*`) that composes the friction gate under fail-closed policy — without claiming automatic closure, a PRODUCTION_READY flip, or a full SpecBoot CLI rewrite. Ladder 27 is OPEN (Audit MEASURED · CQ MEASURED · CR MEASURED · CS–CU pending) after tip `e06df38b` (CQ #377 + CR #379). ADR-0066 remains the friction-gate decision (observe; do not consume that number here). ADR-0069/0070 remain CQ/CR.

## Decision

1. Implement three Layer-0 modules under `src/core/specboot/`:
   - `specboot-continuity-receipt.js`: Nine-field SHA-256 sealed `CS-RCPT-*`.
   - `specboot-continuity-policy-gate.js`: Fail-closed continuity-plan validation (Fundacion Δ=0, Law VI, A6/A7 claim refuse).
   - `specboot-continuity-port.js`: `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-imports `specboot-friction-gate.js` when present (compose, don't rewrite) else fixture/builtin double.
2. Valid plan + continuityMode:
   - `ACTIVE` + friction ok → PASS
   - `HOLD` → HOLD (observe; ≠ automatic closure)
   - Friction refuse / gate reject / auto-seal / PRODUCTION_READY flip → DENY (sealed)
3. Preserve human gates A6 (seal) + A7 (PRODUCTION_READY) — refuse auto.
4. Exclude satellite test from slim; opt-in via `npm run test:mission-cs`.
5. PRODUCTION_READY=NO; Fundacion Δ=0; NON-CLAIM automatic closure / PRODUCTION_READY flip / SpecBoot CLI rewrite / reopen L26 / L27 closeout.
6. Do **not** tip-refresh / implement CT–CU in this mission.

## Alternatives REJECTED

- Auto-seal or auto PRODUCTION_READY flip from friction PASS — refuse (A6/A7).
- Full SpecBoot CLI rewrite / Fundacion writes / reopen L26 / new `docs/schemas/**/*.json` (AT_CEILING 35/35).
- Rewrite friction-gate — compose via soft-import only.

## Consequences

- Positive: Sealed SpecBoot Operator Continuity Port with PASS|DENY|HOLD + chained CS receipts; compose post-L26 E; ~18 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not SpecBoot product rewrite / not automatic closure.
- Invariants: PRODUCTION_READY=NO; L17–L26 never reopen; port green ≠ L27 closeout.

## NON-CLAIMS

- SpecBoot Operator Continuity Port ≠ automatic closure / ≠ PRODUCTION_READY flip
- ≠ full SpecBoot CLI rewrite / ≠ Fundacion writes / PRODUCTION_READY=NO
- ≠ reopen L26 / ≠ L27 closeout / ≠ CT–CU

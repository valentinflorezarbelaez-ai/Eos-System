# ADR-0072 — Mission CT Fundacion Δ=0 Continuity Drill & Reconciliation Port

- **Status:** Accepted — local governed (Ladder 27 Satellite 4)
- **Date:** 2026-09-19
- **Deciders:** EOS local governed use (Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric)
- **Spec:** SPEC-0103

## Context

Post-L26 Workstream F delivered a one-shot Fundacion Δ=0 gameday drill (`fundacion-delta0-gameday.js`, ADR-0067) proving fail-closed reconciliation across CL–CP without Fundacion writes. EOS lacked a recurring Layer-0 **continuity drill / reconciliation port** with sealed receipts (`CT-RCPT-*`) that elevates that gameday into a governed continuity surface — without claiming Fundacion write auth, a PRODUCTION_READY flip, weakening FUNDACION_ALWAYS_DENY, or reopening L26. Ladder 27 is OPEN (Audit MEASURED · CQ MEASURED · CR MEASURED · CS MEASURED · CT–CU pending) after tip `2b3df21a` (#380). ADR-0067 remains the gameday decision (compose; do not consume that number here). ADR-0071 remains CS.

## Decision

1. Implement three Layer-0 modules under `src/core/continuity/`:
   - `fundacion-delta0-continuity-receipt.js`: Nine-field SHA-256 sealed `CT-RCPT-*`.
   - `fundacion-delta0-continuity-policy-gate.js`: Fail-closed continuity-drill plan validation (Fundacion Δ=0, Law VI, ALWAYS_DENY / L26 reopen / PRODUCTION_READY flip claim refuse).
   - `fundacion-delta0-continuity-port.js`: `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-imports `fundacion-delta0-gameday.js` when present (compose, don't fork) else fixture/builtin double.
2. Valid plan + continuityMode:
   - `ACTIVE` + Δ=0 independently checked / reconciliation ok → PASS
   - `HOLD` → HOLD (observe; ≠ automatic closure)
   - mismatch / dirty / pending / Fundacion write / secrets / PRODUCTION_READY flip / L26 reopen / weaken ALWAYS_DENY → DENY (sealed)
3. Preserve FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate — refuse auto; never write Fundacion paths.
4. Exclude satellite test from slim; opt-in via `npm run test:mission-ct`.
5. PRODUCTION_READY=NO; Fundacion Δ=0; NON-CLAIM Fundacion write auth / PRODUCTION_READY flip / weaken ALWAYS_DENY / reopen L26 / L27 closeout.
6. Do **not** tip-refresh / implement CU in this mission.

## Alternatives REJECTED

- Auto PRODUCTION_READY flip or Fundacion writes from gameday PASS — refuse (ALWAYS_DENY + A7).
- Weaken FUNDACION_ALWAYS_DENY / reopen L26 / new `docs/schemas/**/*.json` (AT_CEILING 35/35).
- Fork/rewrite gameday — compose via soft-import only.

## Consequences

- Positive: Sealed Fundacion Δ=0 Continuity Drill & Reconciliation Port with PASS|DENY|HOLD + chained CT receipts; compose post-L26 F; 19 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not Fundacion write auth / not automatic readiness flip.
- Invariants: PRODUCTION_READY=NO; L17–L26 never reopen; port green ≠ L27 closeout.

## NON-CLAIMS

- Fundacion Δ=0 Continuity Port ≠ Fundacion write auth / ≠ PRODUCTION_READY flip
- ≠ weaken FUNDACION_ALWAYS_DENY / ≠ Fundacion path writes / PRODUCTION_READY=NO
- ≠ reopen L26 / ≠ L27 closeout / ≠ tip-refresh / ≠ CU

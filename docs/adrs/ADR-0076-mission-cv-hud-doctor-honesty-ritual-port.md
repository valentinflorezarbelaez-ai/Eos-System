# ADR-0076 — Mission CV HUD/Doctor Honesty Ritual Composition Port

- **Status:** Accepted — local governed (Ladder 28 Satellite 1)
- **Date:** 2026-09-19
- **Deciders:** EOS local governed use (Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric)
- **Spec:** SPEC-0105

## Context

Post-L26 Workstream B delivered Doctor/HUD honesty surfaces (`doctor-hud-honesty.js`, ADR-0063 / #369) — freeze lag chips, dirty-defer, NON-CLAIM chips, pending-port labels — but left them fragmented vs Layer-0 ritual composition with L27 CQ–CT observe. Ladder 28 is OPEN (Audit MEASURED · CV–CZ pending) after tip-open post-#385 pinning freeze honesty to `62d430fb` (#386). ADR-0063 remains the honesty-surface decision (compose; do not consume that number here). ADR-0074 is L28 audit; ADR-0075 is PO-gated prune plan. This ADR elevates B into a governed composition port without tip-refresh or starting CW.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `hud-doctor-honesty-ritual-receipt.js`: Nine-field SHA-256 sealed `CV-RCPT-*`.
   - `hud-doctor-honesty-ritual-policy-gate.js`: Fail-closed honesty-ritual plan validation (Fundacion Δ=0, Law VI, dirty-without-ack, freeze-lag-unmeasured-without-ack, PRODUCTION_READY flip / L27 reopen / tip rewrite claim refuse).
   - `hud-doctor-honesty-ritual-port.js`: `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-imports `../observability/doctor-hud-honesty.js` when present (compose, don't fork; builtin double otherwise). Do **not** wholesale-replace `operator-doctor.js` / `operator-hud.js`.
2. Valid plan + ritualMode:
   - `ACTIVE` + honesty ok → PASS
   - `HOLD` → HOLD (observe; ≠ automatic closure)
   - dirty / freeze-lag-unmeasured-without-ack / Fundacion / secrets / PRODUCTION_READY flip / L27 reopen / tip rewrite → DENY (sealed)
3. Compose B honesty chips into ritual receipt fields; CQ–CT observe as optional labels only (fixture compose OK; do not require live CQ–CT govern for happy path).
4. Preserve FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate — refuse auto; never write Fundacion paths; never tip-rewrite.
5. Exclude satellite test from slim; opt-in via `npm run test:mission-cv`.
6. PRODUCTION_READY=NO; Fundacion Δ=0; NON-CLAIM PRODUCTION_READY flip / L27 reopen / tip rewrite / L28 closeout / tip-refresh / CW.
7. Do **not** tip-refresh / implement CW in this mission. Freeze pin stays `62d430fb` (audit tip) until parent tip-refresh post-CV. HEAD may lag (`a83ece67` prune plan #387) — do not tip-refresh from this package.

## Alternatives REJECTED

- Auto PRODUCTION_READY flip or tip rewrite from honesty PASS — refuse (A7 + A8).
- Reopen L27 / new `docs/schemas/**/*.json` (AT_CEILING 35/35).
- Fork/rewrite `doctor-hud-honesty.js` / wholesale-replace operator-doctor/hud — compose via soft-import only.
- Require live CQ–CT govern for happy path — couples too hard; labels/fixture compose OK.
- Tip-refresh or start CW from this package.

## Consequences

- Positive: Sealed HUD/Doctor Honesty Ritual Composition Port with PASS|DENY|HOLD + chained CV receipts; compose post-L26 B; ~18 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not PRODUCTION_READY flip / not tip rewrite / not L28 closeout.
- Invariants: PRODUCTION_READY=NO; L17–L27 never reopen; port green ≠ L28 closeout; freeze pin stays audit tip until parent tip-refresh.

## NON-CLAIMS

- HUD/Doctor Honesty Ritual Composition Port ≠ PRODUCTION_READY flip / ≠ L27 reopen / ≠ tip rewrite / ≠ GHE
- ≠ L28 closeout / ≠ tip-refresh / ≠ CW / PRODUCTION_READY=NO / Fundacion Δ=0

# Spec — Autonomy Replay & Forensic Observer (SPEC-0043 / Mission AL)

## Purpose

Provide a hermetic, fail-closed, **observe-only** Autonomy Replay &
Forensic Observer: deterministic re-walk of sealed multi-session
timelines from AJ-like EVD ledger + AI-like session records — without
becoming a SIEM product, billing engine, or mutating live autonomy
state.

## Requirements

### R1 — Factory & kind
- `createAutonomyReplayForensicObserver(options)` returns object with
  `kind: 'eos-autonomy-replay-forensic-observer'` and
  `PRODUCTION_READY: 'NO'`.

### R2 — Replay
- `replay(timelineId|filter)` SHALL deterministically re-walk a sealed
  multi-session timeline and reproduce cycle ordering + allow/deny
  outcomes.
- Replay SHALL NOT call `ledger.append` or `sessionStore.save`.

### R3 — Verify inputs fail-closed
- `verifyReplayInputs(...)` SHALL abort with forensic failure when
  inputs are incomplete or chain-broken (no silent gaps).
- Codes: `CHAIN_BROKEN`, `INCOMPLETE_INPUTS`, `SILENT_GAP_FORBIDDEN`,
  `TIMELINE_NOT_FOUND`, `INVALID_TIMELINE`.

### R4 — Forensic export
- `exportForensicTimeline(...)` SHALL emit a post-mortem export
  envelope (`eos-forensic-timeline-export`) with events, ordering,
  outcomes, `observeOnly: true`, `mutatesLiveState: false`.

### R5 — Attribution observe
- `observeAttribution(filter?)` SHALL aggregate AE ECR / ledger cost
  counters when enabled.
- MUST set `billingClaim: false` and MUST NOT claim PRODUCTION_READY
  billing accuracy.

### R6 — Fundacion
- Fundacion export/replay target → `FUNDACION_DENY`.
- Fundacion Δ=0; no writes.

### R7 — Missing deps
- Absent / invalid `ledger` or `sessionStore` (when required) →
  `MISSING_DEP`.

### R8 — Law VI
- No static vendor-key prefix substring in source/tests (runtime synth).
- Sanitize receipts / exports / dumps.

### R9 — Receipts
- `sealReceipt(outcome)` and aborts/successes emit forensic receipts
  with `PRODUCTION_READY:'NO'`, `observeOnly: true`,
  `mutatesLiveState: false`.

### R10 — Honesty
- `health()` / `getState()` carry NON-CLAIM flags
  (`notSiemProduct`, `notBillingAccuracy`,
  `notProductionReadyCostBilling`, `observeOnly`,
  `noLiveStateMutation`, `notAm`).
- Do NOT implement AM.
- No CloudAgent; no live network in CI.

### R11 — Tests
- Hermetic suite ≥12 PASS; slim-excluded basename
  `eos-al-autonomy-replay-forensic-observer.test.js`.

## EARS

- WHEN a sealed multi-session timeline exists in the EVD ledger, THE
  SYSTEM SHALL support hermetic replay that reproduces cycle ordering
  and deny/allow outcomes.
- IF replay inputs are incomplete or chain-broken, THE SYSTEM SHALL
  abort replay and report forensic failure (no silent gaps).
- WHILE attribution observe mode is enabled, THE SYSTEM SHALL
  aggregate AE ECR counters without claiming billing accuracy or
  PRODUCTION_READY.

## Non-requirements
- AM, PRODUCTION_READY flip, CloudAgent, real Fundacion writes,
  SIEM product, billing accuracy, live autonomy state mutation.

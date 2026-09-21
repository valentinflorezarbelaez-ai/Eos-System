# Design — Mission CV HUD/Doctor Honesty Ritual Composition Port

## Architecture

Three Layer-0 modules under `src/core/composition/`:

1. **Receipt** — nine-field SHA-256 seal (`CV-RCPT-*`):
   `{ receiptId, operation, planId, decision, changeId, ritualDigest, timestamp, fundacionDelta, prevReceiptHash }`
   Attached: ritualMode, honestyOk, freezeLagMeasured, dirtyDeferred, nonClaimChips, pendingPorts, cqCtObserveLabels, refuseCodes, NON-CLAIMs.

2. **Policy gate** — fail-closed `evaluatePlan(plan)`:
   Require planId + changeId + ritualMode (ACTIVE|HOLD) + ritualPhase + honestyInput/surface/digest.
   DENY: Fundacion target/write, secrets (Law VI), PRODUCTION_READY flip, auto-seal, L27 reopen, tip rewrite, weaken ALWAYS_DENY, dirty-without-ack, freeze-lag-unmeasured-without-ack, tampered digests.

3. **Port** — `HudDoctorHonestyRitualPort`:
   - soft-import `../observability/doctor-hud-honesty.js` (host) or `/workspace/eos-cv-refs/doctor-hud-honesty.js` (box); else builtin double
   - `govern` / `evaluate` → PASS|DENY|HOLD + sealed receipt
   - `verifyTrail` hash-chain custody
   - CQ–CT observe as optional labels only (no live CQ–CT govern required)

## Decision table

| ritualMode | Honesty | Decision |
| --- | --- | --- |
| ACTIVE | ok (clean + lag measured/match) | PASS |
| HOLD | (any) | HOLD |
| ACTIVE | refuse | DENY |

## Soft-import compose

Do **not** wholesale-replace `operator-doctor.js` / `operator-hud.js`. Soft-import B honesty module only. Builtin double mirrors lag/dirty/NON-CLAIM/pending-port semantics for hermetic tests.

## Explicit non-actions

- No tip-refresh (freeze stays `62d430fb` until parent tip-refresh post-CV)
- No CW
- No schemas JSON (AT_CEILING 35/35)
- No PRODUCTION_READY flip / no Fundacion writes / no L27 reopen

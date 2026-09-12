# Proposal — Mission AT: Operator Continuity / Crash-Recovery Custody Port (SPEC-0051)

## Why

Ladder 17 audit ranks **Operator Continuity / Crash-Recovery Custody Port** after
AS (MEASURED). AI/W/AN provide durable custody on the live path; there is no
dedicated **crash-recovery / continuity custody port** that restarts governed
sessions after process crash with sealed continuity receipts — without claiming
HA multi-region SaaS / multi-AZ failover / CloudAgent fleet recovery.

## What

1. `src/core/continuity/operator-continuity-crash-recovery-port.js` —
   `createOperatorContinuityCrashRecoveryPort`; kind
   `eos-operator-continuity-crash-recovery-port`;
   `checkpoint` / `simulateCrash` / `restart` / `getState` / `sealReceipt` /
   `applyPartial`; injectable `{ store, expectedTip, anEnvelope, now, hash }`;
   fail-closed `OK` / `RESTART_OK` / `TAMPER_DETECTED` / `TIP_MISMATCH` /
   `CUSTODY_CONFLICT` / `MISSING_DEP` / `INVALID_REQUEST` /
   `SECRET_LEAK_FORBIDDEN` / `FUNDACION_DENIED` / `PARTIAL_APPLY_FORBIDDEN`;
   `AT_PRODUCTION_READY='NO'`.
2. Thin `continuity-receipt.js` + `custody-snapshot.js` — seal helpers +
   injectable custody store fakes (+ optional AN envelope continuity adapter).
3. Suite `tests/eos-at-operator-continuity-crash-recovery.test.js`
   (AT1–AT18) hermetic; **no static vendor-key prefix substring**
   (runtime synth); slim-exclude;
   `npm run test:operator-continuity` / `test:mission-at`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## NON-CLAIM

- continuity ≠ HA multi-region SaaS
- continuity ≠ multi-AZ failover product
- continuity ≠ CloudAgent fleet recovery
- not AU/AV/AW
- Fundacion Δ=0; AT_PRODUCTION_READY=NO; Antigravity-first

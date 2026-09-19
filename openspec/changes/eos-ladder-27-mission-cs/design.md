# Design — Mission CS SpecBoot Operator Continuity Port

## Composition

```
plan → SpecbootContinuityPolicyGate.evaluatePlan
     → soft-import / inject / builtin friction double
     → decisionForContinuity(ACTIVE|HOLD, friction)
     → buildSpecbootContinuityReceipt (CS-RCPT-*)
     → verifyTrail (hash chain)
```

## Decisions

| continuityMode | Friction | Decision |
| --- | --- | --- |
| ACTIVE | ok | PASS |
| HOLD | (observe) | HOLD |
| ACTIVE | refuse / dirty / stale / ownership / prereq / A6 / A7 | DENY |

## Soft-import

Prefer host `src/core/specboot/specboot-friction-gate.js` when co-located after post-L26 E.
Else inject or builtin double. Never rewrite the friction gate.

## A6 / A7

- Auto-seal without `humanSealAck` → DENY + `autoSealRefused`
- Auto PRODUCTION_READY flip without `humanProductionReadyAck` → DENY + `autoProductionFlipRefused`
- Gate PASS still emits PRODUCTION_READY=NO

## NON-CLAIMS

Port green ≠ automatic closure ≠ PRODUCTION_READY flip ≠ L27 closeout.

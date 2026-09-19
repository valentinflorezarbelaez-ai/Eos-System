# Design — Mission CT Fundacion Δ=0 Continuity Drill & Reconciliation Port

## Composition

```
plan → FundacionDelta0ContinuityPolicyGate.evaluatePlan
     → soft-import / inject / builtin gameday double
     → decisionForContinuity(ACTIVE|HOLD, gameday)
     → buildFundacionDelta0ContinuityReceipt (CT-RCPT-*)
     → verifyTrail (hash chain)
```

## Decisions

| continuityMode | Gameday / policy | Decision |
| --- | --- | --- |
| ACTIVE | Δ=0 independently checked / reconciliation ok | PASS |
| HOLD | (observe) | HOLD |
| ACTIVE | mismatch / dirty / pending / Fundacion write / secrets / PR flip / L26 reopen / weaken ALWAYS_DENY | DENY |

## Soft-import

Prefer host `src/core/fundacion/fundacion-delta0-gameday.js` when co-located after post-L26 F.
Else inject or builtin double. Never fork/rewrite the gameday; never weaken FUNDACION_ALWAYS_DENY.

## Gates

- Fundacion write / target / weaken ALWAYS_DENY → DENY + FUNDACION_ALWAYS_DENY
- Auto PRODUCTION_READY flip without human ack → DENY + autoProductionFlipRefused
- L26 reopen claim → DENY
- Gate PASS still emits PRODUCTION_READY=NO and fundacionDelta=0

## NON-CLAIMS

Port green ≠ Fundacion write auth ≠ PRODUCTION_READY flip ≠ weaken ALWAYS_DENY ≠ L27 closeout ≠ tip-refresh ≠ CU.

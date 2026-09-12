# Design — Mission AV Governed State Freeze & Drift Observer (SPEC-0053)

## Architecture

Injectable observe-only drift detector over hermetic tip strings (or
freeze/matrix fence text). No live git required in tests. Optional
fail-closed local gate DENYs honesty claims when drift is MEASURED.

```
observe({ freezeTip, matrixTip, observedTip, mode })
  → coerce/parse tips (main_tip / evaluated_tip fences OK)
  → compare freeze ↔ matrix ↔ observed
  → MATCHED | DRIFT_MEASURED (TIP_MISMATCH / FREEZE_MATRIX_MISMATCH)
  → if mode=fail-closed && drift → HONESTY_CLAIM_DENIED
  → sealed receipt (no GH mutation fields)
```

## Fail-closed / report paths

| Condition | Code | Mode |
| --- | --- | --- |
| All tips equal | `MATCHED` | both |
| freeze ≠ observed | `TIP_MISMATCH` / `DRIFT_MEASURED` | observe → report |
| freeze ≠ matrix | `FREEZE_MATRIX_MISMATCH` | observe → report |
| drift + fail-closed | `HONESTY_CLAIM_DENIED` | fail-closed → DENY |
| Bad tip format | `INVALID_TIP` | both |
| Missing freeze/observed | `MISSING_DEP` | both |
| Null request | `INVALID_REQUEST` | both |

## Receipts

Sealed receipts carry freeze/matrix/observed tips + mismatches +
NON-CLAIM flags (`autoMerge=false`, `ghBranchProtectionMutation=false`,
`ghRequiredCheckEnforcement=false`, `ghBillingChange=false`).

## Explicit non-goals

Auto-merge bot, GH required-check enforcement, branch-protection
mutation APIs, GH billing upgrades, AW seam-pack, PRODUCTION_READY flip,
CloudAgent path, live git in hermetic CI.

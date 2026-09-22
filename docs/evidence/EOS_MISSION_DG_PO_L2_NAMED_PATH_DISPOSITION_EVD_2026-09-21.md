# Evidence — Mission DG PO Level-2 Named-Path Disposition Gate Port (SPEC-0116)

- **Date:** 2026-09-21 (America/Bogota)
- **Package:** `/workspace/eos-mission-dg/`
- **Status:** MISSION_DG_CODE_READY
- **PRODUCTION_READY:** NO
- **Fundacion Δ:** 0

## Hermetic verification (box)

```
cd /workspace/eos-mission-dg && npm run test:mission-dg
# tests 17
# pass 17
# fail 0
```

```
node --check src/core/composition/*.js tests/*.js scripts/*.mjs
# all OK
```

## Modules

| Module | Role |
| --- | --- |
| `po-l2-named-path-disposition-receipt.js` | `DG-RCPT-*` nine-field seal + freeze soft-observe (31f811ca) + namedPaths + ceilingHold |
| `po-l2-named-path-disposition-policy-gate.js` | Fail-closed preconditions (empty namedPaths ACTIVE / auto-approve / delete-auth / mass-prune / tip-pin / PR flip / GHE / L30 / L29 / …) |
| `po-l2-named-path-disposition-port.js` | `govern` / `evaluate` / `getDecision` / `verifyTrail` |

## Decisions exercised

- PASS: ACTIVE + namedPaths non-empty + DF_REMEASURE+ADR_0075_HITL+AP_HITL observe + disposition/ceiling ok (≠ delete execution / ≠ tip-pin rewrite / ≠ PRODUCTION_READY flip / ≠ auto-approve)
- HOLD: dispositionMode HOLD (observe; freeze soft-observe only)
- DENY: empty namedPaths ACTIVE, auto-approve, delete-auth, mass-prune, tip-pin rewrite, GHE, Fundacion, secrets, PR flip, L29 reopen, auto-close L30, auto-seal, weaken ALWAYS_DENY, tampered digest

## Freeze honesty

- Freeze pin: `31f811ca` / full `31f811caf7ff28cc25aa9ac87add0e45f4abf650` (Mission DF #415) — soft-observe read-only
- Do NOT rewrite freeze tip pins from this package
- Explicitly: no tip-refresh / no Fundacion / no CloudAgent from this package
- Formal L29 CLOSED retained — NEVER reopen L29
- L30 OPEN (Audit + DF MEASURED · DG–DJ pending) via tip-refresh #416

## NON-CLAIMS

≠ unsupervised delete ≠ mass prune ≠ auto-approve deletes ≠ PRODUCTION_READY flip ≠ tip-pin rewrite ≠ Fundacion write ≠ GHE ≠ L30 auto-close ≠ L29 reopen ≠ CloudAgent ≠ delete execution
Inventory/plan ≠ delete auth; gate ≠ execution (DH later)

## Schemas

No `docs/schemas/**/*.json` added (AT_CEILING 35/35).

# Design — Mission DG PO Level-2 Named-Path Disposition Gate Port

## Composition triad

Same port triad as Mission DF/DA:

1. **Receipt** — nine-field canonical seal + `DG-RCPT-*` + forced freeze soft-observe (`31f811ca`, readOnly, deleteAuthRefused, autoApproveRefused) + ceilingHold (schemasAtCeiling) + namedPaths[]
2. **Policy gate** — fail-closed plan validation (secrets, Fundacion, PR flip, L29 reopen, tip-pin, GHE, L30 auto-close, delete-auth, mass-prune, auto-approve, empty namedPaths for ACTIVE, missing fields, required DF_REMEASURE+ADR_0075_HITL+AP_HITL observe)
3. **Port** — `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-import DF/HITL surfaces; builtin fixture double; PASS|DENY|HOLD

## Disposition behavior

- Soft-observe DF complexity inventory remeasure (observe only)
- Soft-observe ADR-0075 PO-gated prune plan HITL (observe only; plan≠execution)
- Soft-observe AP HITL (observe only)
- Soft-observe DF inventoryDigest when present
- Soft-observe DA receipt patterns optional
- Required observe set: `DF_REMEASURE`, `ADR_0075_HITL`, `AP_HITL`
- ACTIVE + namedPaths non-empty + complete observe + disposition/ceiling ok → PASS (disposition gated sealed ≠ delete execution)
- HOLD → HOLD (observe only)
- Otherwise DENY with sealed receipt

## Freeze soft-observe

Pin `31f811ca` / full `31f811caf7ff28cc25aa9ac87add0e45f4abf650` (Mission DF #415). Product package soft-observes only — ≠ tip-pin rewrite. Formal L29 CLOSED retained. L30 OPEN via tip-refresh #416.

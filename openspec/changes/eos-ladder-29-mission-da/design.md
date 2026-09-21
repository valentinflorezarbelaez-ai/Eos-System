# Design — Mission DA Control-Plane Observability Aggregation Port

## Composition triad

Same port triad as Mission CV/CW/CX/CY:

1. **Receipt** — nine-field canonical seal + `DA-RCPT-*` + forced freeze soft-observe (`2d6ab2d2`, readOnly)
2. **Policy gate** — fail-closed plan validation (secrets, Fundacion, PR flip, L28 reopen, tip-pin, GHE, L29 auto-close, external APM, missing fields, required CV+CW+CX+CY observe)
3. **Port** — `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-import CV–CY honesty; builtin fixture double; PASS|DENY|HOLD

## Aggregation behavior

- Aggregate observe labels / honesty signals from L28 CV/CW/CX/CY soft-import when present (fixture otherwise)
- Required observe set: `CV`, `CW`, `CX`, `CY` (optional CQ/CR/CS/CT/CZ)
- ACTIVE + complete observe + aggregation ok → PASS
- HOLD → HOLD (observe only)
- Otherwise DENY with sealed receipt

## Freeze soft-observe

Pin `2d6ab2d2` (L29 audit #401) until tip-open lands. Product package soft-observes only — ≠ tip-pin rewrite.

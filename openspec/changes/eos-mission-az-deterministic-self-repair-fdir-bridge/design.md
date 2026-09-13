# Design — Mission AZ (SPEC-0057)

## Architecture

```
proposeRepair(req)
  → CLASSIFY (fault-classifier)
  → GATE    (repair-policy-gate: allowlist / DENY classes / Fundacion)
  → PLAN    (repair-plan: deterministic bounded steps)
  → BRIDGE  (optional fdirRemediator / axFault inject — metadata only)
  → SEAL    (repair-receipt: sha256)
```

## Modules (`src/core/developer-engine/`)

| Module | Role |
| --- | --- |
| `self-repair-fdir-bridge.js` | Main API + sanitize + state |
| `fault-classifier.js` | Deterministic class map |
| `repair-plan.js` | Bounded plan + planHash |
| `repair-receipt.js` | Sealed EVD receipt |
| `repair-policy-gate.js` | DENY helpers + allowlist |

## Composition (not rewrite)

- Inject optional `ports.fdirRemediator` / `ports.fdirPort` (V FDIR interface)
- Inject optional `ports.axFault` / `ports.axEngine` (AX fault surface)
- Do **not** copy V/AX/AY source trees into this payload

## Law VI

Scan **only** `MODULE_DIR` = `src/core/developer-engine`. Never scan `tests/`
(forensic fixtures may contain patterns). Fake tokens: `env-fake-token-001`.

## Fail-closed

Unbounded self-mod / Fundacion / Law VI leak → DENY + sealed receipt.
WHILE in progress → no AGI claim; PRODUCTION_READY remains NO.

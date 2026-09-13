# Design — Mission BA (SPEC-0058)

## Architecture

```
runIsolated(req)
  → VALIDATE (request / step shape)
  → GATE     (sandbox-policy-gate: Fundacion / network / policy / missing-dep)
  → BOUNDARY (sandbox-boundary: path prison + env scrub)
  → ISOLATE  (hermetic in-process simulator; optional L9/L10 inject)
  → SEAL     (isolation-receipt: sha256)
```

## Modules (`src/core/developer-engine/`)

| Module | Role |
| --- | --- |
| `local-sandbox-container-port.js` | Main API + sanitize + state |
| `sandbox-boundary.js` | Path prison + env scrub |
| `isolation-receipt.js` | Sealed EVD receipt |
| `sandbox-policy-gate.js` | DENY helpers + allowlist |

## Composition (not rewrite)

- Inject optional `ports.computeWorker` / `ports.l9Worker` / `ports.l10Isolation`
  (L9/L10 compute-worker isolation interface)
- Inject optional `ports.axEngine` / `ports.ayPort` / `ports.azRepair`
- Do **not** copy compute-worker / AX/AY/AZ source trees into this payload

## Law VI

Scan **only** `MODULE_DIR` = `src/core/developer-engine`. Never scan `tests/`
(forensic fixtures may contain patterns). Fake tokens: `env-fake-token-001`.

## Fail-closed

Path escape / network egress / Fundacion / timeout / policy breakout → DENY +
sealed receipt. WHILE isolation active → no K8s multi-tenant / managed SaaS
claim; PRODUCTION_READY remains NO.

# Design — Mission BC Governed Patch / Diff Apply Port (SPEC-0060)

## Layout (`src/core/delivery/`)

| Module | Role |
| --- | --- |
| `governed-patch-diff-apply-port.js` | Facade: `createGovernedPatchDiffApplyPort`, `applyPatch` |
| `patch-diff-policy-gate.js` | Allowlist / Fundacion / Law VI / HITL / seal DENY helpers |
| `apply-receipt.js` | Sealed receipt (`stableStringify` + `sha256Canonical`) |
| `patch-diff-boundary.js` | Path normalize, Fundacion detect, secret scrub, hermetic apply |

## Phases

`VALIDATE → GATE → APPLY → SEAL` (`BC_PHASE_ORDER`). Fail-closed DENY always
seals a receipt and skips APPLY when gated.

## Injectable ports (compose only)

- `ports.axEngine` / `ports.axSeal` — observe AX sealed loop receipt
- `ports.aqNotary` / `ports.aqObserve` — observe AQ notarization

Do **not** vendor-copy AX/AQ modules into this payload.

## Hermetic apply

Structured patch object or minimal unified-diff string → in-memory FS map under
allowlisted relative paths (or `memory://`). No `child_process`, no `git`, no
GitHub API.

## Law VI

Runtime-concat vendor prefix for detect/redact. Scan **MODULE_DIR only**.
Prefer `env-fake-token-001` in tests.

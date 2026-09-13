# Design — Mission AX Sovereign Developer Engine Core (SPEC-0055)

## Architecture

Hermetic **Sovereign Developer Engine Core** under
`src/core/developer-engine/`:

| Module | Role |
| --- | --- |
| `sovereign-developer-engine.js` | Main API `runGovernedCodeLoop`; wires ports; fail-closed |
| `code-loop-phases.js` | PLAN→EDIT→VERIFY→SEAL enum + transition helpers |
| `engine-receipt.js` | Sealed EVD-style receipt; sha256 via `node:crypto` |
| `policy-gate.js` | DENY helpers + artifact allowlist |

## Ports (injectable fakes — do not rewrite AF/AG)

- `afLoop` — optional AF-like `runStep` / `runCycle` / `plan` / `verify`
- `agTools` — optional AG-like `invoke` / `callTool` / `edit`
- `budgetGate` — `beforeCall` / `check` / `shouldAllow`
- `hitlGate` — `approve` / `check` (default DENY when required)
- `lawViGate` — `check` (secret material DENY)
- `writeBarrier` — Fundacion ALWAYS_DENY; local allowlisted OK

## Fail-closed order

1. Validate request → INVALID_REQUEST
2. Artifact allowlist → ARTIFACT_NOT_ALLOWLISTED
3. Law VI → LAW_VI_DENY
4. Budget → BUDGET_DENY
5. HITL (when required) → HITL_REQUIRED
6. Fundacion intent → FUNDACION_DENY
7. PLAN → EDIT (writeBarrier) → VERIFY → SEAL

## Law VI

- Sanitize/redact on errors, dumps, receipts, getState
- Zero forbidden provider secret prefix contiguous literals in source
- Fake fixture values like `env-fake-token-001` only

## NON-CLAIM / ceilings

PRODUCTION_READY=NO; Fundacion Δ=0; no CloudAgent; no AY/AZ/BA/BB;
L17 CLOSED; L18 OPEN; axis Sovereign Developer Engine.

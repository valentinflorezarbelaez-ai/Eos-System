# Spec — Mission BA Local Sandboxed Container / Worker Isolation Port (SPEC-0058)

## Capability

Hermetic Local Sandboxed Container / Worker Isolation Port over developer-engine
and self-repair steps with phases VALIDATE → GATE → BOUNDARY → ISOLATE → SEAL,
fail-closed policy DENY, and sealed EVD-style receipts (sha256).

## EARS (L18)

### Requirement — Isolated execution + receipt

WHEN developer-engine or self-repair step needs isolated execution, THE SYSTEM
SHALL run it via the Local Sandboxed Container / Worker Isolation Port and emit
a sealed receipt.

### Requirement — Escape / network / Fundacion DENY

IF sandbox attempts policy escape, disallowed network egress, or Fundacion
paths, THE SYSTEM SHALL DENY and emit a sealed receipt.

### Requirement — NON-CLAIM while isolation active

WHILE isolation is active, THE SYSTEM SHALL fail-closed and SHALL NOT claim
K8s multi-tenant cloud, managed container SaaS, or CloudAgent remote fleet
completeness.

## Codes (frozen)

`OK`, `COMPLETED`, `DENY`, `ESCAPE_DENY`, `NETWORK_DENY`, `FUNDACION_DENY`,
`POLICY_DENY`, `TIMEOUT_DENY`, `INVALID_REQUEST`, `MISSING_DEP`,
`ARTIFACT_NOT_ALLOWLISTED`.

## Constants

- `BA_PRODUCTION_READY = 'NO'`
- `BA_KIND = 'eos-local-sandboxed-container-worker-isolation'`
- Fundacion Δ=0 / ALWAYS_DENY
- Antigravity-first (no CloudAgent)
- L17 CLOSED; L18 OPEN; AX+AY+AZ MEASURED; BB pending
- compose/extend L9/L10 compute-worker isolation (optional inject ports only)
- Law VI audit: scan **MODULE_DIR only** (`src/core/developer-engine`); never `tests/`

## Out of scope

BB; rewriting L9/L10/AX/AY/AZ modules; Fundacion writes; CloudAgent;
real Docker daemon; flipping PRODUCTION_READY; live network in CI.

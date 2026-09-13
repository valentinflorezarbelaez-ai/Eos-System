# Spec — Mission AX Sovereign Developer Engine Core / Autonomous Code Loop (SPEC-0055)

## Capability

Governed autonomous code loop (Plan → Edit → Verify → Seal) over
allowlisted artifacts with injectable AF/AG-like ports, fail-closed
policy DENY, and sealed EVD-style receipts (sha256).

## EARS (L18)

### Requirement — Governed loop

WHEN an operator requests a governed autonomous code loop over
allowlisted artifacts, THE SYSTEM SHALL run the Sovereign Developer
Engine Core that plans, edits, verifies, and seals a receipt fail-closed.

### Requirement — Policy DENY

IF budget, HITL, Law VI, or Fundacion policy is violated during the loop,
THE SYSTEM SHALL DENY further progress and emit a sealed receipt.

### Requirement — NON-CLAIM while looping

WHILE the autonomous code loop is in progress, THE SYSTEM SHALL not claim
unsupervised internet-facing agency or PRODUCTION_READY coding SaaS
completeness.

## Codes (frozen)

`OK`, `COMPLETED`, `DENY`, `BUDGET_DENY`, `HITL_REQUIRED`, `LAW_VI_DENY`,
`FUNDACION_DENY`, `ARTIFACT_NOT_ALLOWLISTED`, `VERIFY_FAILED`,
`MISSING_DEP`, `INVALID_REQUEST`, `PHASE_DENIED`.

## Constants

- `AX_PRODUCTION_READY = 'NO'`
- `AX_KIND = 'eos-sovereign-developer-engine-core'`
- Fundacion Δ=0 / ALWAYS_DENY
- Antigravity-first (no CloudAgent)
- L17 CLOSED; L18 OPEN; axis Sovereign Developer Engine

## Out of scope

AY/AZ/BA/BB; rewriting AF/AG modules; Fundacion writes; CloudAgent;
flipping PRODUCTION_READY; live network in CI.

# Spec — Mission AZ Deterministic Self-Repair & FDIR Remediation Bridge (SPEC-0057)

## Capability

Hermetic Deterministic Self-Repair & FDIR Remediation Bridge over governed
developer-loop faults with phases CLASSIFY → GATE → PLAN → BRIDGE → SEAL,
fail-closed policy DENY, and sealed EVD-style receipts (sha256).

## EARS (L18)

### Requirement — Remediable fault → plan + receipt

WHEN governed developer-loop fault classified remediable, THE SYSTEM SHALL
produce a deterministic self-repair plan via the FDIR bridge and emit a sealed receipt.

### Requirement — Unbounded / Fundacion / Law VI DENY

IF plan requires unbounded self-mod / Fundacion writes / Law VI leakage,
THE SYSTEM SHALL DENY and emit a sealed receipt.

### Requirement — NON-CLAIM while self-repair in progress

WHILE self-repair is in progress, THE SYSTEM SHALL fail-closed and SHALL NOT
claim unbounded self-modifying AGI, unsupervised internet remediator, or
CloudAgent self-heal fleet completeness.

## Codes (frozen)

`OK`, `COMPLETED`, `DENY`, `UNBOUNDED_SELF_MOD_FORBIDDEN`, `FUNDACION_DENY`,
`LAW_VI_DENY`, `NOT_REMEDIABLE`, `INVALID_FAULT`, `MISSING_DEP`,
`INVALID_REQUEST`, `HITL_REQUIRED`.

## Constants

- `AZ_PRODUCTION_READY = 'NO'`
- `AZ_KIND = 'eos-deterministic-self-repair-fdir-bridge'`
- Fundacion Δ=0 / ALWAYS_DENY
- Antigravity-first (no CloudAgent)
- L17 CLOSED; L18 OPEN; AX+AY MEASURED
- compose/extend V FDIR + AX loop faults (optional inject ports only)
- Law VI audit: scan **MODULE_DIR only** (`src/core/developer-engine`); never `tests/`

## Out of scope

BA/BB; rewriting V/AX/AY modules; Fundacion writes; CloudAgent;
flipping PRODUCTION_READY; live network in CI.

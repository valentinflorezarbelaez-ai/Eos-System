# Proposal — Mission AZ Deterministic Self-Repair & FDIR Remediation Bridge (SPEC-0057)

## Why

Governed developer-loop faults that are remediable need a **deterministic**,
fail-closed bridge into FDIR-style remediation planning with sealed receipts —
without claiming unbounded self-modifying AGI, unsupervised internet remediation,
or a CloudAgent self-heal fleet.

## What

- `proposeRepair({ fault, allowlist, ports })` → classify → gate → plan → bridge → seal
- Fault classifier (SYNTAX_ERROR, MISSING_DEPENDENCY, BUDGET_TRIP, SCHEMA_DEVIATION remediable;
  UNBOUNDED_SELF_MOD, FUNDACION_WRITE, LAW_VI_LEAK DENY)
- Deterministic bounded repair plans (stable hash)
- Sealed sha256 receipts
- Optional injectable `fdirPort` / `axFault` (compose V + AX; do not rewrite)

## NON-CLAIM / constraints

- PRODUCTION_READY=NO; Fundacion Δ=0; Law VI; Antigravity-first
- L17 CLOSED; L18 OPEN; AX+AY MEASURED; BA–BB pending
- Law VI audit scans **MODULE_DIR only** (`src/core/developer-engine`)

## Out of scope

BA/BB; rewriting V/AX/AY; Fundacion writes; CloudAgent; flipping PRODUCTION_READY.

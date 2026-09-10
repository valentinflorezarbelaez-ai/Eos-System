# Design — T5 KEEP PO-named prune hold / gate

## Decision

**HOLD** (explicit "no prune this quarter") — PO has not supplied exact CANDIDATE tool names. Deliver gate/process only; catalog stays 80==CANONICAL_TOOLS (P5 reconcile green).

## Approach

1. Runbook documents two legal modes: `HOLD` | `PO_NAMED`.
2. `PO_NAMED` requires exact tool names ⊆ S5 CANDIDATE set; then catalog reconcile + lock green **before** any delete (delete itself is out of this change set).
3. Lock fail-closed on missing HOLD/PO_NAMED language, missing NON-CLAIM, or PRODUCTION_READY≠NO.
4. Gate CLI is observational: validates mode + optional named list; **never** mutates catalog/server.
5. S5 inventory lock remains SSOT for KEEP/CANDIDATE counts; T5 does not replace S5.

## Risks

Low — docs + lock + gate only. Accidental prune prevented by FORBIDDEN + HOLD + gate NON-MUTATING.

## AT_CEILING

No new `docs/schemas/**/*.json`.

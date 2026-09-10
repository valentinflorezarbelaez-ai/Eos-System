# Design — T6 Complexity ceiling hold / named prune gate

## Decision

**HOLD** (standing order: hold AT_CEILING; no new schemas) — PO has not supplied exact schema/engine paths from P6 inventory. Deliver gate/process + standing-order evidence; R4 `auditComplexityBudgetLock` must stay green (35/35 AT_CEILING).

## Approach

1. Runbook documents two legal modes: `HOLD` | `PO_NAMED`.
2. `PO_NAMED` requires exact paths ⊆ P6 ranked CANDIDATE set (or named schema JSON under docs/schemas with PO evidence); then budget recount + lock green **before** any prune (prune itself is out of this change set).
3. Lock fail-closed on missing HOLD/PO_NAMED language, missing NON-CLAIM, PRODUCTION_READY≠NO, or R4 complexity-budget-lock failure.
4. Gate CLI is observational: validates mode + optional named list; **never** mutates schemas, engines, or COMPLEXITY_BUDGET.json.
5. R4 complexity-budget-lock + P6 inventory lock remain SSOT for count/status and candidate inventory; T6 does not replace them.

## Risks

Low — docs + lock + gate only. Accidental prune / vibe schema prevented by FORBIDDEN + HOLD + gate NON-MUTATING + existing R4 DENY on OVER.

## AT_CEILING

No new `docs/schemas/**/*.json`. Standing order reinforced.

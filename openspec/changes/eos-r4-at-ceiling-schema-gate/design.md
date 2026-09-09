# Design — R4 AT_CEILING schema pressure gate

## Context

- SSOT budget: `docs/governance/COMPLEXITY_BUDGET.json`
- Locked rule: `counting_rule.schemas.id = recursive_docs_schemas_json` / glob `docs/schemas/**/*.json`
- Current: schemas=35, max_schemas=35, status=AT_CEILING
- Pattern to mirror: `scripts/lib/p6-inventory-lock.js` + verify:strict audit block

## Decisions

1. One lock module `complexity-budget-lock.js` exports `auditComplexityBudgetLock(rootDir, options?)`.
2. Counting walks `docs/schemas` recursively for `*.json` (same as Q4). Options allow temp-fixture overrides (`budgetPath`, `schemasDir`, `budgetObject`) without mutating production trees.
3. Deny (fail-closed) when any of:
   - budget file missing
   - `counting_rule` / locked id missing or wrong
   - filesystem count > max (OVER pressure; includes added extra schema fixture)
   - declared `status` is `WITHIN_BUDGET` while count >= max (dishonest)
   - declared `status` mismatches derived status from count vs max
4. Allow honest `AT_CEILING` when count === max and rule locked (current production state).
5. Allow honest `WITHIN_BUDGET` when count < max (triangulation fixture).
6. Policy text lives in release evidence + optional `policy` field on budget JSON (no max raise).
7. verify:strict calls the audit and folds failures into the report (same as P6 inventory lock).

## NON-claims

- Gate != prune. Inventory remains inventory-only.
- Does not quarantine, delete, or move schema files.
- Does not change App Fuerza / Fundacion.

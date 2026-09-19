# Spec — po-gated-prune-execution-plan (stub)

## State invariants (MUST hold)

- This change SHALL be docs-only: zero files under `src/`; SHALL NOT delete, quarantine, move, or archive any host or box path.
- `PRODUCTION_READY` SHALL remain `NO`.
- `fundacionDelta` SHALL remain `0` (FUNDACION_ALWAYS_DENY).
- Schemas SHALL remain AT_CEILING 35/35 — this change SHALL NOT add `docs/schemas/**/*.json`.
- Ladder 17 through Ladder 27 SHALL remain CLOSED_FOR_LOCAL_GOVERNED_USE and SHALL NEVER be reopened.
- This change SHALL NOT claim to be Mission CV or Ladder 28 satellite work (outside CV–CZ default path).
- This change SHALL NOT rewrite freeze/matrix/m4 tip pins or perform tip-refresh.
- Inventory A dispositions SHALL be treated as proposals; inventory SHALL NOT equal delete authorization.
- Plan landing SHALL NOT equal execution authorization.

## Requirement: Execution plan present

The repository SHALL contain `docs/releases/EOS_PO_GATED_PRUNE_EXECUTION_PLAN_2026-09-19.md` declaring:

- Purpose + NON-CLAIMS (inventory≠auth; plan≠execution)
- Preconditions (tip honesty cite-only, verify:strict, PO Level-2 named paths)
- Batches 0–4 ordered by risk with inventory row IDs
- PO authorization checkbox tables
- Stop conditions / never-touch list

## Requirement: ADR-0075 present

The repository SHALL contain `docs/adrs/ADR-0075-po-gated-complexity-prune-execution-plan.md` recording plan-only decision and non-decisions.

## EARS (stub)

### WHEN
- WHEN an operator opens the PO-gated prune execution plan after inventory A lands, THE SYSTEM SHALL present Batches 0–4 with row IDs and an empty authorization table (blank = N).

### WHILE
- WHILE this docs-only change is in flight, THE SYSTEM SHALL keep PRODUCTION_READY=NO and fundacionDelta=0 and schemas AT_CEILING and SHALL NOT execute prune actions and SHALL NOT start Mission CV and SHALL NOT rewrite freeze tip pins.

### IF … THEN
- IF a change under this OpenSpec deletes/quarantines/archives a path, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE for this change.
- IF a change under this OpenSpec claims to be Mission CV or L28 satellite work, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE.
- IF a change under this OpenSpec adds `docs/schemas/**/*.json`, THEN THE SYSTEM SHALL treat that as OUT OF SCOPE (AT_CEILING).
- IF PO authorization is blank for a path, THEN a future execute workstream SHALL treat authorize as N (fail-closed).

### THE SYSTEM SHALL
- THE SYSTEM SHALL bind proposed actions to inventory row IDs A-001..A-068.
- THE SYSTEM SHALL keep Law VI CLEAN in payload docs/openspec/adrs.
- THE SYSTEM SHALL require a separate execute OpenSpec/APPLY before any mutation.

## NON-CLAIM fence

- Inventory ≠ delete auth
- Plan ≠ execution
- Plan ≠ Mission CV / L28 work / tip-open
- Plan ≠ tip-refresh / freeze rewrite
- true_orphans ≠ safe-to-remove
- Archive disposition ≠ executed quarantine
- Batch authorize Y ≠ auto-run
- AT_CEILING ≠ obligation to prune immediately
- Never reopen L17–L27
- Fundacion Δ=0 always

# Complexity Budget Gate (R4 delta)

Capability: fail-closed schema pressure gate while COMPLEXITY_BUDGET is AT_CEILING.

## Requirements

### Requirement: Locked recursive counting rule

The complexity budget lock SHALL count schemas with `counting_rule.schemas.id = recursive_docs_schemas_json` (glob `docs/schemas/**/*.json`). Missing or alternate counting rules MUST fail closed.

#### Scenario: Missing counting_rule denies

- GIVEN a budget object without `counting_rule.schemas.id`
- WHEN `auditComplexityBudgetLock` runs
- THEN `ok` is false and failures mention counting_rule

### Requirement: OVER count denies

When recursive filesystem count exceeds `budgets.max_schemas`, verify MUST deny (fail closed).

#### Scenario: Extra schema file beyond max denies

- GIVEN AT_CEILING budget with max_schemas = N and a temp schemas tree with N+1 JSON files
- WHEN the audit runs against that fixture
- THEN `ok` is false (OVER / schema pressure)

### Requirement: Dishonest WITHIN_BUDGET at ceiling denies

Declaring `status: WITHIN_BUDGET` while count already equals max MUST fail closed.

#### Scenario: Dishonest status at ceiling

- GIVEN count === max_schemas and status WITHIN_BUDGET
- WHEN the audit runs
- THEN `ok` is false

### Requirement: Honest AT_CEILING exact allows

#### Scenario: Production 35/35 AT_CEILING

- GIVEN real COMPLEXITY_BUDGET with schemas 35/35 AT_CEILING and locked recursive rule
- WHEN the audit runs on the repo root
- THEN `ok` is true

### Requirement: Honest WITHIN_BUDGET under ceiling allows

#### Scenario: Under ceiling fixture

- GIVEN count < max and status WITHIN_BUDGET with locked rule
- WHEN the audit runs
- THEN `ok` is true

### Requirement: Policy forbids new schemas at ceiling

While status is AT_CEILING, new schema JSON under `docs/schemas/` is forbidden unless PO raises max_schemas or prunes. Gate != executed prune.

#### Scenario: Policy documented

- GIVEN the R4 evidence release doc
- WHEN operators read the policy section
- THEN it states new schemas are forbidden at AT_CEILING unless PO raises max or prunes, and NON-CLAIM gate != prune

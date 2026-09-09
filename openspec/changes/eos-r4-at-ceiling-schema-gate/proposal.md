# Proposal — EOS R4 AT_CEILING schema pressure gate

## Why

Ladder 6 audit K4: Q4 locked honesty at schemas **35/35** AT_CEILING (counting_rule = 
ecursive_docs_schemas_json on docs/schemas/**/*.json). Any new schema JSON under docs/schemas/ breaks the ceiling. verify:strict currently only asserts the budget file exists — it does not fail closed on OVER count, dishonest WITHIN_BUDGET at ceiling, or missing counting_rule.

## What

Fail-closed gate/policy (R4 ONLY):

1. scripts/lib/complexity-budget-lock.js — audit that DENIES when:
   - recursive filesystem schema count **>** udgets.max_schemas (OVER / added-schema pressure)
   - status claims WITHIN_BUDGET while count already equals max (dishonest ceiling)
   - counting_rule missing or not the locked recursive id
   - AT_CEILING + count == max and a temp-fixture introduces an **additional** schema file beyond budget
2. Wire audit into scripts/verify-eos.js (strict path)
3. Document policy: **new schemas under docs/schemas are forbidden while AT_CEILING unless PO raises max_schemas or prunes**
4. TDD suite 	ests/eos-r4-at-ceiling-schema-gate.test.js + 
pm run test:r4
5. Spanish evidence + freeze note; PRODUCTION_READY=NO; Fundacion Δ=0

## Routing

**SDD** (ADR-0010 / docs/base-standards.md organic routing). Substantial policy + verify surface — not DIRECT. Human requested Spec-Driven Development + Strict TDD.

## NON-goals

- Gate ≠ executed prune (do **not** execute P6 quarantine; no PO-named paths)
- Inventory ≠ quarantine
- doctor ≠ verify (no doctor/fusion-light changes in R4)
- Do **not** raise max_schemas
- No App Fuerza / Fundacion / src/core kernel changes
- No new root npm dependencies
- Not R6-only rename theater — this is the AT_CEILING **pressure** gate; honesty checks needed for fail-closed are in scope of the same lock

## Approach

OpenSpec artifacts → RED tests (temp fixtures) → minimal lock module → verify wire → GREEN/triangulate → evidence → commit/push (no PR merge).

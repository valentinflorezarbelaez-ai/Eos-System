# EOS Schema Design Index

## Purpose

This directory contains the proposed canonical contracts for the EOS SDD Kernel. They are designed for a human-directed orchestrator that coordinates specialized agents under explicit authority, budgets, evidence requirements and stop conditions.

## Files

| File | Responsibility |
| --- | --- |
| `docs/policies/EOS-CONTEXT-AND-TOKEN-EFFICIENCY-POLICY.md` | Rules for layered context, token budgets, structured output, retries, escalation and efficiency metrics |
| `mission-package.schema.json` | Mission-level contract: direction, authority, scope, budgets, orchestration and evidence policy |
| `task-contract.schema.json` | Delegated task contract: role, agent, inputs, outputs, acceptance, tools, surfaces, budgets and rollback |
| `hitl-receipt.schema.json` | Human approval, rejection, revocation or deferral receipt with scoped authority and expiry |
| `scripts/validate_schemas.py` | Reproducible syntax and invariant validation |

## Design Decisions

The schemas deliberately use references and hashes instead of copying large context payloads. This reduces prompt size and prevents multiple agents from receiving divergent versions of the same artifact. Large documents belong in canonical artifacts; task payloads should carry only the relevant references and focused excerpts.

Budgets are explicit at both mission and task levels. EOS must track reserved, consumed and remaining resources. A budget overrun pauses the work and produces a policy event; it never authorizes silent continuation.

The task contract is stricter than a natural-language prompt. An agent has no permission beyond its declared tools, read roots, write roots, protected surfaces, authority level and approval state. Acceptance criteria are linked to verification methods and evidence states.

The HITL receipt is scoped and expiring. It cannot grant global authority, and it cannot override the monotonicity rule. Expiry, rejection or scope violation has an explicit fallback.

## Validation Evidence

The validation script reported:

```
VALID mission-package.schema.json: 11 required top-level fields
VALID task-contract.schema.json: 16 required top-level fields
VALID hitl-receipt.schema.json: 11 required top-level fields
ALL SCHEMAS VALID
```

This proves JSON syntax and selected invariants only. It does not yet prove full JSON Schema semantic validation against positive and negative fixtures. That is the next implementation task.

## Next Safe Milestone

Create `docs/schemas/` in the EOS repository only after human review of these contracts. Then add:

1. Positive fixtures for valid mission, task and receipt documents;
2. Negative fixtures for missing authority, expired receipts, invalid hashes, undeclared tools, protected-surface writes and budget violations;
3. A JSON Schema validator in the project test suite;
4. Cross-schema policy checks that JSON Schema alone cannot express;
5. A read-only integration test proving that an invalid contract cannot reach the dispatcher.

No agent should receive permission to implement or execute external effects as part of this schema milestone.

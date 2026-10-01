# ARCHITECTURE & SCOPE RULES (GGA / EOS GOVERNANCE)

## 1. Zero-Bloat L0 Dependency Boundary
- **Tier A Runtime**: Strictly Node.js native built-ins (`node:fs`, `node:path`, `node:crypto`, `node:child_process`, `node:readline`, `node:os`).
- **Zero Third-Party Dependencies**: No `npm install` packages allowed in the core execution path.
- **Clean Clone Guarantee**: Code compiles and passes all unit tests on a fresh machine with 0 external network calls.

## 2. 9-Subagent Topology (EOS L0)

> Attribution: this topology is an EOS construct. It was originally inspired by the upstream `agent-teams-lite` layout, which is now **archived and deprecated** in favour of `gentle-ai`, so it must not be cited as a live design source. See [ADR-0019](../architecture/adrs/ADR-0019-gentleman-ecosystem-integration-registry.md) and `docs/governance/GENTLEMAN_ECOSYSTEM_REGISTRY.json`.

1. **Agente Intake (RDD):** Redacts `docs/intake/` and validates human PO authority.
2. **Agente Spec (SDD):** Crystallizes EARS contracts and BDD Gherkin in `docs/specs/`.
3. **Agente Architect:** Builds acyclic DAGs (`docs/tasks/`) and enforces scope rules.
4. **Agente TDD:** Redacts failing tests (`tests/`) prior to implementation.
5. **Agente Forja:** Writes minimum pure native code (`src/core/`) to pass tests.
6. **Agente Guardian Angel (GGA):** Audits code for dead code, memory leaks, and scope violations.
7. **Agente Balanza (Evidence):** Calculates SHA-256 hashes and certifies 7 epistemic states.
8. **Agente Memoria MCP (Engram-L0):** Manages SQLite + FTS5 causal index.
9. **Agente Deploy Soberano:** Executes clean clone gates and seals canary releases.

## 3. Epistemic State Invariants
All artifacts must transition through:
`ASSUMPTION` -> `NOT_VERIFIED` -> `PARTIALLY_VERIFIED` -> `VERIFIED` -> `PRODUCTION_READY_WITHIN_TESTED_SCOPE`.

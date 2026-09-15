# ADR-0035 — Mission BR Sovereign Intent Parser & Atomic Task DAG Decomposer Port

- **Status:** Accepted — local governed
- **Date:** 2026-09-15
- **Deciders:** EOS local governed use (Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric)
- **Spec:** SPEC-0075

## Context

Ladder 22 audit ordered BR→BV under axis **Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric**.
L17/L18/L19/L20/L21 remain CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened.
Ladder 22 is OPEN (BR in progress; BS–BV pending).

EOS previously executed individual missions under BH and attested multi-agent actions under BM, but lacked a
typed, deterministic, and fail-closed **Sovereign Intent Parser & Atomic Task DAG Decomposer Port** to decompose
high-level operational goals into validated acyclic directed task graphs with topological sorting, cycle detection,
dependency prerequisite validation, and cryptographically sealed `BR-RCPT-*` receipts.

## Decision

1. Add three **new** Layer-0 modules under `src/core/orchestration/`:
   - `intent-decomposition-receipt.js` — sealed `BR-RCPT-*` receipts (nine-field SHA-256 via `node:crypto`)
   - `intent-decomposition-policy-gate.js` — fail-closed checks (cycle detection via Kahn's algorithm, dependency validation, Fundacion ALWAYS_DENY)
   - `sovereign-intent-parser-port.js` — port facade (`createSovereignIntentParserPort`, `parseIntent`, `decomposeTaskDag`, `validateDagTopology`, `verifyDecompositionTrail`)
2. Use pure Node.js standard primitives only (`node:crypto`). No third-party graph or workflow libraries.
3. Validate strict acyclicity using Kahn's topological sort algorithm; detect self-cycles, two-node cycles, and transitive multi-node cycles immediately.
4. Seal every decomposition outcome (OK / DENY) with canonical nine-field SHA-256 body; chain `prevReceiptHash`; verify provenance trails.
5. Keep `PRODUCTION_READY=NO`, Fundacion ALWAYS_DENY (`fundacionDelta=0`), Antigravity-first, Law VI CLEAN.
6. Exclude hermetic BR tests from default slim discovery (`SLIM ≤ 145`) via `scripts/test-runner.js` and provide dedicated opt-in `npm run test:mission-br`.

## Alternatives considered AND REJECTED

### A. Unstructured prose task lists (vibe decomposition)
**Rejected.** Open-ended prompts or unstructured string arrays without topological sorting or cycle detection
inevitably permit circular dependencies, unresolvable deadlocks, and unverified execution order.
Technical reason: Kahn's algorithm provides deterministic $O(V + E)$ verification of acyclicity and executable order.

### B. Heavy external workflow engines (Temporal / Airflow / LangGraph)
**Rejected.** Introducing external distributed orchestrators or heavy Python/Java runtime dependencies violates
EOS L0 purity, introduces massive latency and attack surface, and breaks the local governed workstation contract.
Technical reason: A hermetic, pure-Node Layer-0 port provides exact deterministic guarantees with zero external dependencies.

## Consequences

- **Positive:** Deterministic decomposition of operational intents into executable DAGs; cryptographically sealed `BR-RCPT-*` provenance receipts.
- **Negative:** Requires explicit dependency definition; circular workflows fail closed and must be restructured.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, zero hardcoded secrets (Law VI).

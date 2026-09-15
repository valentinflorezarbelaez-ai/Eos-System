# Proposal — Mission BR Sovereign Intent Parser & Atomic Task DAG Decomposer Port (SPEC-0075)

## Why

Ladder 22 central axis **Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric**
requires a typed, deterministic, and fail-closed **Sovereign Intent Parser & Atomic Task DAG Decomposer Port**
that parses human or autonomous operational intents, decomposes them into strictly acyclic directed task graphs
with validated topological dependencies, rejects cycles and ambiguous prerequisites, and seals every decomposition
outcome (OK / DENY) under evidence custody (`BR-RCPT-*`) after Ladder 21 (BM–BQ) CLOSED/MEASURED.

Without it, task decomposition in EOS remains unstructured prose or ad-hoc prompts — not cryptographically
sealed `BR-RCPT-*` provenance graphs.

## What changes

- New Layer-0 modules under `src/core/orchestration/` (NEW directory; compose BH/BM/BP, do NOT rewrite `attestation/` or `consensus/`):
  - `intent-decomposition-receipt.js` — sealed `BR-RCPT-*` receipts via `node:crypto`
  - `intent-decomposition-policy-gate.js` — fail-closed validation (cycle rejection, dependency validation, syntax bounds, FUNDACION_ALWAYS_DENY)
  - `sovereign-intent-parser-port.js` — facade (`parseIntent`, `decomposeTaskDag`, `validateDagTopology`, `verifyDecompositionTrail`)
- Hermetic test suite `tests/eos-br-sovereign-intent-parser-port.test.js`
- Patcher script `scripts/patch-mission-br.mjs`
- OpenSpec envelope, ADR-0035, evidence ledger, release document

## Non-goals

- Flipping `PRODUCTION_READY` to YES
- Writing to `Documents/Fundacion` (Fundacion Δ=0 strictly preserved)
- CloudAgent execution
- General AGI planner completeness claims
- BS–BV implementation (separate sequential missions)
- Reopening L17, L18, L19, L20, or L21
- Rewriting `src/core/attestation/` or `src/core/consensus/`

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17 / L18 / L19 / L20 / L21 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L22 | OPEN (BR in progress; BS–BV pending) |
| Axis | Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric |
| Antigravity-first | yes |
| SLIM | ≤145 (BR test excluded like BM/BH/BK) |
| Base tip | `fd180e0` / `e74d3fc` post-#309 / #310 |

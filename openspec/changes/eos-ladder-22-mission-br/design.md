# Design — Mission BR Sovereign Intent Parser & Atomic Task DAG Decomposer Port (SPEC-0075)

## Overview

Layer-0 hermetic intent parsing & DAG decomposition port located in `src/core/orchestration/`.
Pure Node.js built-ins (`node:crypto`) only. Evaluates intents into a normalized Task DAG:
nodes with unique IDs, required capability tags, execution prerequisites, and bounded timeouts.
Implements Kahn's topological sort algorithm to verify acyclicity and guarantee executable sequence.
Every operation emits a cryptographically sealed receipt: `BR-RCPT-*`.

## Components

1. **Receipt (`intent-decomposition-receipt.js`)**:
   Nine-field SHA-256 seal:
   `{ receiptId, intentId, rawIntentHash, parsedGoal, nodeCount, edgeCount, status, timestamp, prevReceiptHash }` → `BR-RCPT-*`
2. **Policy Gate (`intent-decomposition-policy-gate.js`)**:
   Fail-closed checks:
   - `CYCLICAL_DEPENDENCY_DENY`: Rejects any circular prerequisite chain (A → B → A).
   - `AMBIGUOUS_INTENT_DENY`: Rejects malformed, blank, or unbounded goal descriptions.
   - `MISSING_PREREQUISITE_DENY`: Rejects nodes pointing to non-existent upstream dependencies.
   - `DUPLICATE_NODE_ID_DENY`: Enforces unique node identifiers within graph topology.
   - `FUNDACION_ALWAYS_DENY`: Strictly blocks intents targeting `Documents/Fundacion`.
3. **Port Facade (`sovereign-intent-parser-port.js`)**:
   `createSovereignIntentParserPort({ now, hash })`
   - `parseIntent(rawIntent)`: Normalizes intent text, extracts goals, constraints, and target artifacts.
   - `decomposeTaskDag(intent)`: Decomposes normalized intent into atomic DAG nodes and dependency edges.
   - `validateDagTopology(graph)`: Executes cycle detection and topological sorting.
   - `verifyDecompositionTrail(receipts)`: Verifies cryptographic hash integrity and sequence.

## Constraints

- `PRODUCTION_READY=NO`; `Fundacion Δ=0`; Antigravity-first; Law VI clean (zero API keys or secrets in source).
- No external heavy graph libraries; standard Node primitives only.
- Hermetic tests: zero network calls, deterministic pseudo-clocks.

## NON-CLAIM

≠ General AGI planner · ≠ Autonomous unconstrained reasoning · ≠ PRODUCTION_READY workflow product

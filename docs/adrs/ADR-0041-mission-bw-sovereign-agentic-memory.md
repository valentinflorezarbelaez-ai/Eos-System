# ADR-0041 — Mission BW Sovereign Agentic Knowledge Graph & Associative Memory Port

- **Status:** Accepted — local governed (Ladder 23 Satellite 1)
- **Date:** 2026-09-15
- **Deciders:** EOS local governed use (Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric)
- **Spec:** SPEC-0080

## Context

Ladders 11 through 22 are formally CLOSED_FOR_LOCAL_GOVERNED_USE and sealed against modification.
Ladder 23 establishes the **Sovereign Autonomous Synthesis, Distributed Invariant Consensus & Self-Reification Fabric**.
Autonomous agents operating over multi-step DAG workflows require persistent, tamper-evident semantic memory and associative graph indexing that functions locally without external cloud dependencies.
Existing solutions in AI typically rely on cloud vector databases (e.g. Pinecone) or graph databases (e.g. Neo4j), introducing network latency, credential leakage risks, and vendor lock-in.

Mission BW delivers a pure Layer-0 sovereign knowledge graph and associative memory port that provides:
1. Deterministic node ingestion with canonical SHA-256 digests.
2. Weighted relationship edge linking with bidirectional traversal.
3. Bounded breadth-first associative traversal with decay scoring and visited deduplication to eliminate infinite cycle loops.
4. Fail-closed screening for plain secrets (Law VI) and external paths (`FUNDACION_ALWAYS_DENY`).
5. Cryptographically sealed `BW-RCPT-*` receipts verifying chain of custody.

## Decision

1. Implement three Layer-0 modules under `src/core/memory/`:
   - `agentic-memory-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`BW-RCPT-*`) via `node:crypto`.
   - `agentic-memory-policy-gate.js`: Fail-closed policy gate enforcing schema bounds, cycle limits, Law VI secret screening, and Fundacion write barrier.
   - `sovereign-agentic-memory-port.js`: Unified port facade (`createSovereignAgenticMemoryPort`, `storeNode`, `getNode`, `linkEdge`, `queryAssociative`, `deleteNode`, `getGraphMetrics`, `verifyMemoryTrail`).
2. Decay-weighted relevance scoring formula:
   `score = (accumulatedWeight / (1 + depth * 0.5)) * (1 + 0.1 * log1p(accessCount))`
3. Visited entity tracking prevents cyclic graph traversal loops.
4. Exclude satellite test suite `tests/eos-bw-sovereign-agentic-memory-port.test.js` from default test discovery (`SLIM ≤ 145`) via `scripts/test-runner.js` and provide dedicated opt-in `npm run test:mission-bw`.
5. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, zero external npm dependencies.

## Alternatives considered AND REJECTED

### A. Cloud Vector Database Integration (Pinecone / ChromaDB / Weaviate)
**Rejected.** Integrating cloud vector databases requires external network calls, bearer token credentials (violating Law VI), and non-deterministic approximate nearest neighbor (ANN) retrieval.
Technical reason: Pure Layer-0 associative graph indexing provides microsecond deterministic retrieval with zero plain secrets and zero network calls.

### B. Unbounded Recursive Graph Traversal
**Rejected.** Unbounded graph traversal risks infinite recursion or memory exhaustion on cyclical knowledge graphs.
Technical reason: Bounded BFS with an explicit visited Set guarantees $O(V + E)$ complexity and deterministic termination.

## Consequences

- **Positive:** Persistent, tamper-evident associative memory for autonomous agents; 20/20 hermetic tests passing; zero secrets; Fundacion Δ=0.
- **Negative:** Traversal bounded to max depth 10.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held.

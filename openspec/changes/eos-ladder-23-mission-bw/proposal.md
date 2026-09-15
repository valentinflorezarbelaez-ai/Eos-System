# Change Proposal — Mission BW: Sovereign Agentic Knowledge Graph & Associative Memory Port

## 1. Why

Autonomous agents executing long-horizon tasks across multi-step DAG workflows require persistent, tamper-evident semantic memory and associative knowledge graph indexing. Existing memory approaches in AI either rely on external cloud vector databases (introducing network latency, telemetry leakage, and vendor lock-in) or suffer from catastrophic context forgetting and hallucinations.

EOS requires a pure Layer-0 sovereign knowledge graph and associative memory port that provides:
- Bounded associative traversal with decay-weighted relevance scoring.
- Entity-relation graph storage with strict schema and cycle safeguards.
- Cryptographic receipt sealing (`BW-RCPT-*`) with SHA-256 state digests.
- Strict Law VI secret filtering and external write barrier protection (`FUNDACION_ALWAYS_DENY`).

## 2. What Changes

1. Implement `src/core/memory/agentic-memory-receipt.js` to build canonical `BW-RCPT-*` receipts.
2. Implement `src/core/memory/agentic-memory-policy-gate.js` with fail-closed validation for nodes, edges, bounds, and secrets.
3. Implement `src/core/memory/sovereign-agentic-memory-port.js` with associative search, graph traversal, and receipt custody.
4. Add comprehensive unit tests in `tests/eos-bw-sovereign-agentic-memory-port.test.js`.
5. Exclude the suite from default slim discovery in `scripts/test-runner.js` and register `"test:mission-bw"` in `package.json`.

## 3. Impact Assessment

- **Scope:** `src/core/memory/`, `tests/`, `docs/`.
- **Breaking Changes:** None. Fully backwards-compatible Layer-0 module.
- **Dependencies:** Pure Node.js built-ins (`node:crypto` only).

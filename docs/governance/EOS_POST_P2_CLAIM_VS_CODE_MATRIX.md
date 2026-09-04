# EOS Post-P2 Claim-vs-Code & Evidence Matrix

**Document ID:** MAT-CLAIM-CODE-P2-001  
**Status:** CANONICAL_VERIFICATION_MATRIX  
**Date:** 2026-08-20  
**Authority:** Human Director & EOS Senior Systems Architect  

---

## 1. Epistemic Validation Taxonomy

Every architectural claim in EOS is classified into one of five rigorous tiers:
1. **`PROVEN_CAPABILITY`**: Implemented in active code and validated by deterministic, reproducible automated test passes with SHA-256 evidence receipts.
2. **`DISCOVERED_COMPATIBILITY`**: Verified through AST/manifest static inspection, syntax validation, and dependency parsing.
3. **`DECLARED_SUPPORT`**: Documented or structured in a schema/manifest, but not exercised in live execution.
4. **`SIMULATED_ONLY`**: Implemented as a mock, synthetic fixture, or simulated harness.
5. **`BLOCKED / NOT_AUTHORIZED`**: Explicitly prohibited by governance invariants (e.g., live production network calls, unvetted external mutations).

---

## 2. Exhaustive Claim-vs-Code Matrix

| Architectural Claim | Implemented Code Location | Test & Evidence Reference | Epistemic Classification | Scope & Boundary Constraints |
|---|---|---|---|---|
| **Universal Multi-Stack Discovery** | `src/core/discovery/universal-technical-discovery-engine.js` | `tests/p1-multi-stack-discovery.test.js` (7 tests) | `PROVEN_CAPABILITY` (for tested fixtures) | Validated on Node/TS, Python, Go, Rust fixtures; does not generalize automatically to uninspected repos |
| **8-Dimensional Governed Selection** | `src/core/discovery/governed-technical-selection-engine.js` | `tests/p1-governed-technical-selection.test.js` (4 tests) | `PROVEN_CAPABILITY` | Evaluates 2+ candidates with weighted scoring and runner-up generation |
| **Dual Machine/Human ADR Generation** | `src/core/discovery/governed-technical-selection-engine.js` | `tests/p1-governed-technical-selection.test.js` | `PROVEN_CAPABILITY` | Emits Draft 2020-12 JSON ADR with SHA-256 + Markdown |
| **Operational Stack Compatibility Receipt** | `src/core/discovery/operational-capability-receipt-engine.js` | `tests/p1-operational-capability-receipts.test.js` (6 tests) | `PROVEN_CAPABILITY` (local sandbox) | Validates build/test execution in sandbox linked to ADR |
| **Model Capability & ZDR Verification** | `src/core/discovery/operational-capability-receipt-engine.js` | `tests/p1-operational-capability-receipts.test.js` | `PROVEN_CAPABILITY` (local evaluation) | Evaluates JSON generation, tool-calling syntax, and latency budget offline; does not prove external vendor compliance |
| **Local Endpoint Contract Verification** | `src/core/discovery/operational-capability-receipt-engine.js` | `tests/p1-operational-capability-receipts.test.js` | `PROVEN_CAPABILITY` (local mock) | Validates response/error schemas and rate-limit headers |
| **Safe Fallback Degradation** | `src/core/discovery/operational-capability-receipt-engine.js` | `tests/p1-operational-capability-receipts.test.js` | `PROVEN_CAPABILITY` | Gracefully switches to fallback and emits degraded capability receipt |
| **Reversibility Proof ($\Delta = 0$)** | `src/core/discovery/operational-capability-receipt-engine.js` | `tests/p1-operational-capability-receipts.test.js` | `PROVEN_CAPABILITY` | Mathematically proves zero residual state via before/after SHA-256 hash comparison |
| **Minimal Integration Gatekeeper Lifecycle** | `src/core/governance/integration-gatekeeper.js` | `tests/p2-integration-gatekeeper.test.js` (5 tests) | `PROVEN_CAPABILITY` (offline) | Enforces 9-state progression with mandatory HITL receipts |
| **Deep Payload Leakage Defense (Base64/URL)** | `src/core/governance/integration-gatekeeper.js` | `tests/p2-adversarial-integration-gates.test.js` (7 tests) | `PROVEN_CAPABILITY` | Recursively decodes and detects obfuscated secrets, tripping FDIR kill switch |
| **SSRF & Metadata Defense** | `src/core/governance/integration-gatekeeper.js` | `tests/p2-adversarial-integration-gates.test.js` | `PROVEN_CAPABILITY` | Blocks loopback and `169.254.169.254` cloud metadata targets |
| **Anti-Replay Nonce Enforcement** | `src/core/governance/integration-gatekeeper.js` | `tests/p2-adversarial-integration-gates.test.js` | `PROVEN_CAPABILITY` | Detects repeated nonces and freezes execution |
| **Credential Expiry Boundary (TTL)** | `src/core/governance/integration-gatekeeper.js` | `tests/p2-adversarial-integration-gates.test.js` | `PROVEN_CAPABILITY` | Fails closed when credentials exceed `expires_at` |
| **Token Metering & Cost Audit** | `src/core/economics/token-economics-audit-engine.js` | `tests/p2-token-economics.test.js` (6 tests) | `PROVEN_CAPABILITY` | Accurately calculates input/output tokens and cost vectors |
| **Context Redundancy & Jaccard Duplication** | `src/core/economics/token-economics-audit-engine.js` | `tests/p2-token-economics.test.js` | `PROVEN_CAPABILITY` | Measures duplicate token percentage and scores progressive disclosure |
| **Anti-Infinite-Loop on Identical Retries** | `src/core/economics/token-economics-audit-engine.js` | `tests/p2-token-economics.test.js` | `PROVEN_CAPABILITY` | **Blocks identical retries immediately** and escalates to HITL |
| **Executive Mission Reporter with Metric Provenance** | `src/core/observability/executive-mission-reporter.js` | `tests/p2-executive-mission-reporter.test.js` (4 tests) | `PROVEN_CAPABILITY` | Emits JSON/MD reports with explicit `MEASURED`, `ESTIMATED`, `NOT_RUN` provenance tags |
| **E2E Runtime-to-Ledger Reconciliation** | Full pipeline across `src/core/` | `tests/p2-runtime-observability-reconciliation.test.js` (2 tests) | `PROVEN_CAPABILITY` (local hermetic) | 100% of runtime events reconciled in `HashChainedLedger` and executive report |
| **Live External Cloud Provider Invocations** | N/A | None (Network blocked) | `BLOCKED / NOT_AUTHORIZED` | Zero external network egress permitted |
| **Live Third-Party Zero Data Retention Compliance** | N/A | None (Contractual audit required) | `NOT_PROVEN / BLOCKED` | ZDR is evaluated offline; real vendor compliance is unproven |
| **External Repository Mutation (`PRJ-FUNDACION`)** | N/A | `tests/p0-fundacion-contract-boundary.test.js` | `BLOCKED (Δ = 0)` | Contractually locked in `LEVEL_0 / READ_ONLY` |
| **15 Non-Verified MCP Tools** | `src/mcp-server.js` | `docs/mcp/MCP_TOOL_CAPABILITY_MATRIX.md` | `SIMULATION_ONLY` | Declared simulation tools; no real execution permitted |

---

## 3. Findings & Resolution Actions

1. **ADR-0002 ID Collision**:
   - `ADR-0002-autonomous-control-plane-architecture.md` and `ADR-0002-luxe-registry-architecture.md` share the same ID.
   - *Recommendation*: Renumber `ADR-0002-luxe-registry-architecture.md` to `ADR-0002-LUXE` or next available sequential number during cleanup phase.
2. **Re-export Adapters in `scripts/engine/`**:
   - `scripts/engine/epistemic-evidence-engine.js`, `scripts/engine/hitl-gatekeeper.js`, `scripts/engine/sdd-fsm-engine.js` are small stubs pointing to `src/core/sdd/`.
   - *Status*: Maintained as `LEGACY_COMPATIBILITY` so older test suites remain 100% green without breaking imports.
3. **Legacy Ledger Adapter**:
   - `scripts/engine/mission-ledger.js` is superseded by `HashChainedLedger` in `src/core/sdd/epistemic-evidence-engine.js` per `ADR-0009`.

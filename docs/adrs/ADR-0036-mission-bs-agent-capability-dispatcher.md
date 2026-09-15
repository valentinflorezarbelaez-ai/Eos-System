# ADR-0036 — Mission BS Dynamic Agent Capability Matcher & Governed Dispatcher Port

- **Status:** Accepted — local governed
- **Date:** 2026-09-15
- **Deciders:** EOS local governed use (Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric)
- **Spec:** SPEC-0076

## Context

Ladder 22 audit ordered BR→BV under the axis **Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric**.
L17 through L21 remain CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened.
Ladder 22 is OPEN (Mission BR completed; Mission BS in progress; BT–BV pending).

Following Mission BR's decomposition of sovereign operational intents into acyclic DAGs with Kahn's topological sort,
EOS required a governed mechanism to assign each discrete task node to certified agent capability profiles without
relying on manual dispatch, random worker assignment, or unverified agent claims.
The **Dynamic Agent Capability Matcher & Governed Dispatcher Port** matches required task capabilities to attested
agent profiles, enforces fail-closed clearance levels, blocks uncertified execution, and seals every dispatch
decision with cryptographic receipts (`BS-RCPT-*`).

## Decision

1. Implement three Layer-0 modules under `src/core/orchestration/`:
   - `agent-capability-matcher-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`BS-RCPT-*`) via `node:crypto`.
   - `agent-capability-matcher-policy-gate.js`: Fail-closed policy gate enforcing `UNCERTIFIED_CAPABILITY_DENY`, `UNATTESTED_AGENT_DENY`, `INSUFFICIENT_CLEARANCE_DENY`, and `FUNDACION_ALWAYS_DENY`.
   - `dynamic-agent-capability-dispatcher-port.js`: Unified port facade (`createAgentCapabilityDispatcherPort`, `registerAgentProfile`, `matchAgentForTask`, `dispatchTask`, `batchDispatchDag`, `verifyDispatchTrail`).
2. Implement deterministic agent matching: sort candidates by clearance level descending, then lexicographically by `agentId`.
3. Support batch topological DAG dispatch: consume validated DAG nodes from Mission BR, verify topological order via Kahn's algorithm, and dispatch each node sequentially with chained receipt hashes.
4. Enforce strict attestation custody: unattested agents or uncertified roles are rejected fail-closed with diagnostic failure receipts.
5. Invariants preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0` (ALWAYS_DENY), Antigravity-first, zero hardcoded secrets (Law VI).
6. Exclude satellite test suite `tests/eos-bs-dynamic-agent-capability-dispatcher-port.test.js` from default test discovery (`SLIM ≤ 145`) via `scripts/test-runner.js` and provide dedicated opt-in `npm run test:mission-bs`.

## Alternatives considered AND REJECTED

### A. Ad-hoc Round-Robin Worker Queue
**Rejected.** Generic round-robin or FIFO queues assign tasks without checking capability tags, security clearances, or attestation status.
Technical reason: Blind assignment leads to runtime privilege escalation, execution failures, and security contract violations.

### B. Heavy Cloud Orchestrator (Kubernetes Scheduler / Celery / BullMQ)
**Rejected.** External job queues or distributed schedulers introduce Redis/RabbitMQ/etcd infrastructure, asynchronous network dependencies, and severe latency.
Technical reason: EOS operates a local governed control plane requiring zero-network Layer-0 purity with microsecond deterministic dispatch.

## Consequences

- **Positive:** Deterministic, capability-driven task assignment; cryptographic `BS-RCPT-*` dispatch provenance trails; seamless integration with Mission BR topological DAGs.
- **Negative:** Tasks requiring uncertified capabilities fail closed and require explicit agent enrollment.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, zero hardcoded secrets (Law VI).

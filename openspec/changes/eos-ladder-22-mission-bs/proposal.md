# Proposal — Mission BS Dynamic Agent Capability Matcher & Governed Dispatcher Port (SPEC-0076)

## Why

Having completed Mission BR (SPEC-0075) to decompose intents into acyclic directed task graphs,
the Ladder 22 axis **Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric**
now requires a typed, fail-closed **Dynamic Agent Capability Matcher & Governed Dispatcher Port**.

Without it, task nodes produced by the DAG cannot be deterministically matched to certified agent roles
or governed by cryptographic identity attestation (BM). Agents would either run arbitrary tasks without
role enforcement or require manual assignment without sealed provenance (`BS-RCPT-*`).

## What changes

- New Layer-0 modules under `src/core/orchestration/`:
  - `agent-capability-matcher-receipt.js` — sealed `BS-RCPT-*` receipts via `node:crypto`
  - `agent-capability-matcher-policy-gate.js` — fail-closed capability profile validation & clearance checks
  - `dynamic-agent-capability-dispatcher-port.js` — facade (`registerAgentProfile`, `matchAgentForTask`, `dispatchTask`, `batchDispatchDag`, `verifyDispatchTrail`)
- Hermetic test suite `tests/eos-bs-dynamic-agent-capability-dispatcher-port.test.js`
- Patcher script `scripts/patch-mission-bs.mjs`
- OpenSpec change, ADR-0036, evidence ledger, release notes

## Non-goals

- Flipping `PRODUCTION_READY` to YES
- Writing to `Documents/Fundacion`
- CloudAgent execution
- Kubernetes scheduler, Celery, or RabbitMQ product claims
- BT–BV implementation
- Reopening L17, L18, L19, L20, or L21
- Rewriting `src/core/attestation/` or `src/core/consensus/`

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17 / L18 / L19 / L20 / L21 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L22 | OPEN (BR done; BS in progress; BT–BV pending) |
| Axis | Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric |
| Antigravity-first | yes |
| SLIM | ≤145 (BS test excluded like BR/BM/BH/BK) |

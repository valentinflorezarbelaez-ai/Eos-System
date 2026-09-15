# ADR-0038 — Mission BU Multi-Agent Consensus Orchestration Gate & Escalation Fabric

- **Status:** Accepted — local governed
- **Date:** 2026-09-15
- **Deciders:** EOS local governed use (Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric)
- **Spec:** SPEC-0078

## Context

Ladder 22 audit ordered BR→BV under the axis **Sovereign Intent Decomposition & Dynamic Workflow Orchestration Fabric**.
L17 through L21 remain CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened.
Ladder 22 is OPEN (Mission BR, BS, and BT completed; Mission BU in progress; BV pending).

Following Mission BR (Intent Decomposition), Mission BS (Agent Capability Matcher & Dispatcher), and Mission BT (Workflow State Machine & Checkpoint Fabric),
EOS required a formal consensus gate to govern multi-agent agreement on high-privilege operations, enforce quorum rules
(`UNANIMITY`, `MAJORITY`, `K_OF_N`), verify voter identity and attestation, and provide an explicit, cryptographically
sealed escalation path when consensus deadlocks.
The **Multi-Agent Consensus Orchestration Gate & Escalation Fabric** seals every proposal, vote tally, consensus decision,
and escalation event under cryptographic custody (`BU-RCPT-*`).

## Decision

1. Implement three Layer-0 modules under `src/core/orchestration/`:
   - `consensus-orchestration-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`BU-RCPT-*`) via `node:crypto`.
   - `consensus-orchestration-policy-gate.js`: Fail-closed policy gate enforcing `QUORUM_NOT_MET_DENY`, `PROPOSAL_REJECTED_DENY`, `UNAUTHORIZED_VOTER_DENY`, `UNATTESTED_VOTER_DENY`, `DUPLICATE_VOTE_DENY`, and `FUNDACION_ALWAYS_DENY`.
   - `dynamic-consensus-orchestration-port.js`: Unified port facade (`createConsensusOrchestrationPort`, `submitProposal`, `castVote`, `evaluateConsensus`, `escalateDecision`, `getProposalStatus`, `verifyConsensusTrail`).
2. Enforce formal quorum policies:
   - `UNANIMITY`: 100% approval required; any single rejection rejects the proposal.
   - `MAJORITY`: Strictly > 50% eligible approvals required.
   - `K_OF_N`: Threshold of $k$ approvals required ($1 \le k \le N$).
3. Attestation verification: restrict voting strictly to declared eligible rosters and attested agent keys.
4. Support cryptographic escalation: deadlocked proposals can be escalated only by designated operator/governance keys.
5. Invariants preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0` (ALWAYS_DENY), Antigravity-first, zero hardcoded secrets (Law VI).
6. Exclude satellite test suite `tests/eos-bu-dynamic-consensus-orchestration-port.test.js` from default test discovery (`SLIM ≤ 145`) via `scripts/test-runner.js` and provide dedicated opt-in `npm run test:mission-bu`.

## Alternatives considered AND REJECTED

### A. Unilateral Agent Execution for Sensitive State Jumps
**Rejected.** Allowing individual agents to authorize destructive migrations, model routing modifications, or security policy overrides risks unvetted action execution.
Technical reason: Multi-agent consensus gates guarantee that multiple attested agents independently verify and approve high-stakes actions.

### B. Distributed Consensus (Raft / Paxos / Blockchain)
**Rejected.** Heavy distributed consensus algorithms require networked server nodes, leader election heartbeats, network sockets, or blockchain gas fees.
Technical reason: EOS operates a local governed control plane requiring zero-network Layer-0 purity with microsecond deterministic voting and local receipts.

## Consequences

- **Positive:** Multi-party agreement for sensitive tasks; formal quorum rules; deadlock escalation path; cryptographic `BU-RCPT-*` provenance receipts.
- **Negative:** Consensus workflows require multiple agent votes before advancing.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, zero hardcoded secrets (Law VI).

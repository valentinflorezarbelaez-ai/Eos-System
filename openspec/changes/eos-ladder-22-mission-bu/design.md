# Design — Mission BU Multi-Agent Consensus Orchestration Gate & Escalation Fabric (SPEC-0078)

## Overview

Layer-0 multi-agent consensus orchestration gate located in `src/core/orchestration/`.
Governs multi-agent consensus voting, quorum evaluation, and deadlock escalation.
Every proposal, vote tally, and consensus decision is cryptographically sealed as a `BU-RCPT-*` receipt.

## Components

1. **Receipt (`consensus-orchestration-receipt.js`)**:
   Nine-field SHA-256 seal:
   `{ receiptId, proposalId, action, quorumPolicy, tallyDigest, outcome, timestamp, consensusSignature, prevReceiptHash }` → `BU-RCPT-*`
2. **Policy Gate (`consensus-orchestration-policy-gate.js`)**:
   Quorum policies: `UNANIMITY`, `MAJORITY`, `K_OF_N`.
   Fail-closed checks:
   - `QUORUM_NOT_MET_DENY`: Vote count does not satisfy required quorum.
   - `PROPOSAL_REJECTED_DENY`: Rejection votes exceed allowed tolerance.
   - `UNAUTHORIZED_VOTER_DENY`: Voter agent is not in the declared eligible voter roster.
   - `UNATTESTED_VOTER_DENY`: Voter identity is not attested.
   - `DUPLICATE_VOTE_DENY`: Agent has already voted on this proposal.
   - `PROPOSAL_CLOSED_DENY`: Attempt to vote on an already finalized proposal.
   - `FUNDACION_ALWAYS_DENY`: Action or target references forbidden Fundacion path.
   - `MALFORMED_PROPOSAL_DENY`: Proposal missing ID, action, or voters.
3. **Port Facade (`dynamic-consensus-orchestration-port.js`)**:
   `createConsensusOrchestrationPort({ now, hash, policyGate, attestationPort })`
   - `submitProposal({ proposalId, action, target, quorumPolicy, k, voters, deadline })`
   - `castVote(proposalId, { agentId, vote, rationale, signature })`
   - `evaluateConsensus(proposalId)`
   - `escalateDecision(proposalId, { authorityId, signature, rationale })`
   - `getProposalStatus(proposalId)`
   - `verifyConsensusTrail(receipts)`

## Constraints

- `PRODUCTION_READY=NO`; `Fundacion Δ=0`; Antigravity-first; Law VI clean.
- Pure Node.js standard library (`node:crypto` only).
- Hermetic test execution.

## NON-CLAIM

≠ Raft/Paxos distributed consensus · ≠ Blockchain smart contracts · ≠ PRODUCTION_READY consensus product

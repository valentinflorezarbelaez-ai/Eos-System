# Design — Mission BO Multi-Agent Consensus & Two-Key Handoff Gate (SPEC-0072)

## Overview

Layer-0 hermetic multi-agent consensus gate under existing
`src/core/consensus/` (ADD new files only). SHA-256 via `node:crypto`.
Fail-closed DENY + sealed failure receipt. Optional injectable ports
compose builder-verifier-custody / agent-handoff-envelope without
rewriting those siblings. Sibling `byzantine-consensus-engine.js` remains
untouched (BI/BJ sibling-allow).

## Components

1. **Receipt** — nine-field SHA-256 seal:
   `{ receiptId, proposalId, builderAgentId, verifierAgentId, proposalHash,
     evidenceHash, consensusStatus, timestamp, prevReceiptHash }` → `BO-RCPT-*`
2. **Policy gate** — SELF_VERIFY_DENY, MISSING_VERIFIER, MISSING_BUILDER,
   MISSING_EVIDENCE, EVIDENCE_MISMATCH, ATTESTATION_REJECTED,
   FUNDACION_ALWAYS_DENY, malformed DENY
3. **Gate facade** — `createMultiAgentConsensusGate({ now, hash, custodyPort, handoffEnvelope })`
   - `submitProposal(...)` — accept builder proposal
   - `submitAttestation(...)` — accept verifier attestation (Two-Key check)
   - `evaluateConsensus(...)` — gate → seal CONSENSUS_GRANTED / DENY BO-RCPT-*
   - `verifyReceiptTrail(receipts)` — hash + chain custody

## Two-Key rule

- `builderAgentId !== verifierAgentId` always (case-insensitive after normalize)
- Self-verification DENY (`SELF_VERIFY_DENY`)
- Missing verifier DENY; missing evidence DENY; evidence mismatch DENY

## Constraints

- PRODUCTION_READY=NO; Fundacion Δ=0; Antigravity-first; Law VI CLEAN
- NO rewrite of byzantine-consensus-engine.js / custody / handoff
- SLIM ≤145 via exclude of BO hermetic satellite test (like BH/BK/BM/BN)
- L17–L20 CLOSED never reopen; L21 OPEN

## NON-CLAIM

≠ BFT/PoS/blockchain/P2P gossip · ≠ heavy Raft/Blockchain · ≠ PRODUCTION_READY=YES consensus product
≠ single-agent auto-approval · ≠ unsigned async handoff

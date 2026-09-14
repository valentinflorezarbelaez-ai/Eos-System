# ADR-0032 — Mission BO Multi-Agent Consensus & Two-Key Handoff Gate

- **Status:** Accepted — local governed
- **Date:** 2026-09-14
- **Deciders:** EOS local governed use (Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric)
- **Spec:** SPEC-0072

## Context

Ladder 21 audit (ADR-0029) ordered BM→BQ under axis **Sovereign Multi-Agent
Provenance & Continuous Sentinel Fabric**. L17/L18/L19/L20 remain
CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened. L21 is OPEN
(BM MEASURED; BN MEASURED; BO in progress; BP–BQ pending).

V5 shipped builder-verifier-custody (BUILDER != VERIFIER). V3 shipped
agent-handoff-envelope. BM shipped agent identity attestation (MEASURED).
BN shipped continuous integrity sentinel (MEASURED). Mission BO needs a
typed, hermetic **Multi-Agent Consensus & Two-Key Handoff Gate** that
requires distinct builder/verifier agents, seals BO-RCPT-* receipts, and
DENYs self-verification — without claiming BFT/PoS/blockchain/P2P gossip,
heavy Raft/Blockchain, or PRODUCTION_READY=YES consensus product.

Sibling `byzantine-consensus-engine.js` already exists under
`src/core/consensus/` and MUST NOT be rewritten (BI/BJ sibling-allow
pattern). BO ADDS `two-key-*` / `multi-agent-consensus-gate.js` and
composes custody / handoff via optional injectable ports.

Base tip (expected): `6b796454c69566d4c66d83b835cee42e7a542917`
(StartsWith `6b79645`; tip post-#302 / BN MEASURED). WARN-continue.

## Decision

1. Add three **new** modules under existing `src/core/consensus/`:
   - `two-key-consensus-receipt.js` — sealed `BO-RCPT-*` receipts
     (nine-field SHA-256)
   - `two-key-consensus-policy-gate.js` — SELF_VERIFY_DENY /
     MISSING_VERIFIER / MISSING_EVIDENCE / EVIDENCE_MISMATCH /
     ATTESTATION_REJECTED / Fundacion DENY
   - `multi-agent-consensus-gate.js` — facade
     (`createMultiAgentConsensusGate`, `submitProposal`,
     `submitAttestation`, `evaluateConsensus`, `verifyReceiptTrail`)
2. Use hermetic Node `crypto` only; no net/fs writes outside hermetic
   fixtures; Fundacion ALWAYS_DENY.
3. Seal every evaluate outcome (GRANT / DENY) with canonical nine-field
   SHA-256 body; chain `prevReceiptHash`; verify trails.
4. Two-Key rule: `builderAgentId !== verifierAgentId` always;
   self-verification DENY.
5. Optional injectable ports (`custodyPort`, `handoffEnvelope`) — compose
   without exclusive ownership or rewrite of
   `builder-verifier-custody.js` / `agent-handoff-envelope.js`
   (and any `builder-verifier-custody-gate.js` if present on host).
6. Keep `PRODUCTION_READY=NO`, Fundacion ALWAYS_DENY (`fundacionDelta=0`),
   Antigravity-first, Law VI CLEAN on BO-owned `two-key-*` /
   `multi-agent-consensus-gate.js` files only.
7. Exclude hermetic BO tests from SLIM (≤145) via CRLF-safe patcher
   (same pattern as BH/BK/BM/BN).

## Alternatives considered AND REJECTED

### A. Single-agent auto-approval

**Rejected.** Allowing the same agent to build and auto-approve would
collapse the constitutional BUILDER != VERIFIER disjunction (Law III /
ADR-0010 / V5 custody) into a rubber-stamp. Technical reason: Two-Key
`builderAgentId !== verifierAgentId` with fail-closed `SELF_VERIFY_DENY`
is required for BO DoD; single-agent auto-approval is insufficient for
sovereign multi-agent provenance.

### B. Unsigned async handoff

**Rejected.** Fire-and-forget async handoffs without sealed BO-RCPT-*
receipts, `prevReceiptHash` chaining, evidenceHash custody, or fail-closed
policy gates would allow silent self-verify and evidence tampering.
Technical reason: canonical nine-field SHA-256 seal + trail verify +
evidence match is required for BO DoD.

### C. Heavy Raft / Blockchain

**Rejected.** Shipping a Raft cluster, blockchain ledger, BFT/PoS, or
P2P gossip consensus product would claim distributed-consensus completeness,
require network peers and heavy runtime, and break Antigravity-first.
Technical reason: NON-CLAIM `bftPosBlockchainP2pGossip=false` /
`heavyRaftBlockchain=false` / `consensusProduct=false` / `cloudAgent=false`;
gate is local hermetic two-key handoff custody, not a blockchain/Raft
product. Sibling `byzantine-consensus-engine.js` remains untouched and is
explicitly NOT this mission's surface.

## Consequences

- Payload ships ADR-0032 + evidence + OpenSpec (epistemic parity with BN/BM).
- Host bootstrap copies modules/tests/openspec/docs/patcher; runs
  `test:mission-bo`; holds SLIM≤145; runs verify:strict honestly (no fake
  check-count invention).
- BP–BQ remain pending; L17–L20 stay CLOSED forever relative to this ladder.
- PRODUCTION_READY stays NO; byzantine/custody/handoff untouched.

## NON-CLAIM

- ≠ BFT / PoS / blockchain / P2P gossip
- ≠ heavy Raft / Blockchain
- ≠ PRODUCTION_READY=YES consensus product
- ≠ single-agent auto-approval
- ≠ unsigned async handoff
- ≠ reopening L17 / L18 / L19 / L20
- ≠ BP–BQ implementation in this change
- ≠ rewrite of `byzantine-consensus-engine.js` / custody / handoff

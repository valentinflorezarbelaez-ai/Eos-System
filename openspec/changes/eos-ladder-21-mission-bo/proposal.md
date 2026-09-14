# Proposal — Mission BO Multi-Agent Consensus & Two-Key Handoff Gate (SPEC-0072)

## Why

Ladder 21 axis **Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric**
needs a typed, fail-closed **Multi-Agent Consensus & Two-Key Handoff Gate**
that requires distinct builder/verifier agents, seals every outcome under
`BO-RCPT-*` custody, and DENYs self-verification — composing V5
builder-verifier-custody + V3 agent-handoff-envelope after BM MEASURED /
BN MEASURED / L20 CLOSED. Without it, two-key handoff remains implicit
docs — not sealed BO-RCPT-* consensus provenance.

## What changes

- New Layer-0 modules under existing `src/core/consensus/` (ADD only; do NOT
  rewrite `byzantine-consensus-engine.js` or siblings — BI/BJ pattern):
  - `two-key-consensus-receipt.js` — sealed `BO-RCPT-*` receipts
  - `two-key-consensus-policy-gate.js` — fail-closed two-key policy
  - `multi-agent-consensus-gate.js` — facade
    (`submitProposal`, `submitAttestation`, `evaluateConsensus`,
    `verifyReceiptTrail`)
- Optional injectable ports: `custodyPort`, `handoffEnvelope` (stubs in tests)
- Hermetic tests `tests/eos-bo-multi-agent-consensus-gate.test.js`
- CRLF-safe patcher `scripts/patch-mission-bo.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0032, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- CloudAgent
- BFT / PoS / blockchain / P2P gossip / heavy Raft claims
- BP–BQ implementation
- Reopening L17 / L18 / L19 / L20
- Rewriting `byzantine-consensus-engine.js` / custody / handoff siblings
- Single-agent auto-approval
- Unsigned async handoff

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17 / L18 / L19 / L20 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L21 | OPEN (BM MEASURED; BN MEASURED; BO in progress; BP–BQ pending) |
| Axis | Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric |
| Antigravity-first | yes |
| SLIM | ≤145 (BO test excluded like BH/BK/BM/BN) |
| Base tip | `6b796454c69566d4c66d83b835cee42e7a542917` (StartsWith `6b79645`) |
| Two-Key | builderAgentId !== verifierAgentId always |

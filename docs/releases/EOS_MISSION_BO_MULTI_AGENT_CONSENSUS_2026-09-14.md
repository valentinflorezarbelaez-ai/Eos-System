# EOS Mission BO — Multi-Agent Consensus & Two-Key Handoff Gate (SPEC-0072)

**Date:** 2026-09-14 (America/Bogota)
**Branch:** `grok/mission-bo-multi-agent-consensus-gate`
**Base tip (expected):** `6b796454c69566d4c66d83b835cee42e7a542917` (StartsWith `6b79645`)
**PRODUCTION_READY:** NO
**Fundacion Δ:** 0 ALWAYS_DENY
**Axis:** Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric
**Ladder:** L21 OPEN (BM MEASURED; BN MEASURED; BO); L17–L20 CLOSED never reopen

## Summary

Ships a hermetic Layer-0 **Multi-Agent Consensus & Two-Key Handoff Gate**
under existing `src/core/consensus/` (ADD only; do NOT rewrite
`byzantine-consensus-engine.js`):

| Module | Role |
| --- | --- |
| `two-key-consensus-receipt.js` | Sealed `BO-RCPT-*` nine-field SHA-256 receipts |
| `two-key-consensus-policy-gate.js` | Fail-closed SELF_VERIFY / MISSING_VERIFIER / EVIDENCE / REJECTED |
| `multi-agent-consensus-gate.js` | `submitProposal` / `submitAttestation` / `evaluateConsensus` / `verifyReceiptTrail` |

Pure Node.js (`crypto` only); optional injectable ports to
builder-verifier-custody / agent-handoff-envelope siblings — never rewritten.
Two-Key rule: `builderAgentId !== verifierAgentId` always.

## NON-CLAIM

≠ BFT/PoS/blockchain/P2P gossip · ≠ heavy Raft/Blockchain · ≠ PRODUCTION_READY=YES consensus product ·
≠ single-agent auto-approval · ≠ unsigned async handoff ·
≠ CloudAgent · ≠ Fundacion writes · ≠ BP–BQ · ≠ reopen L17–L20

## Tests

`tests/eos-bo-multi-agent-consensus-gate.test.js` — hermetic `node --test`
(~16). Excluded from SLIM (≤145) like BH/BK/BM/BN.

## Host

`MISSION_BO_BOOTSTRAP.ps1` — worktree pin StartsWith `6b79645`, branch, copy,
patch, `test:mission-bo`, SLIM≤145, `verify:strict`, commit, push.

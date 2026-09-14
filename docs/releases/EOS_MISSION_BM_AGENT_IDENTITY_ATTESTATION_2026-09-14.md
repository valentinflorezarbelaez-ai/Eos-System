# EOS Mission BM — Agent Identity Attestation & Action Provenance Port (SPEC-0070)

**Date:** 2026-09-14 (America/Bogota)
**Branch:** `grok/mission-bm-agent-identity-attestation`
**Base tip (expected):** `1d8ff62bcc262edfc6a1b3b23fd6c19162821117` (StartsWith `1d8ff62`)
**PRODUCTION_READY:** NO
**Fundacion Δ:** 0 ALWAYS_DENY
**Axis:** Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric
**Ladder:** L21 OPEN (BM); L17–L20 CLOSED never reopen

## Summary

Ships a hermetic Layer-0 **Agent Identity Attestation & Action Provenance Port**
under NEW `src/core/attestation/`:

| Module | Role |
| --- | --- |
| `agent-action-receipt.js` | Sealed `BM-RCPT-*` nine-field SHA-256 receipts |
| `agent-identity-policy-gate.js` | Fail-closed DENY codes |
| `agent-identity-attestation-port.js` | `registerAgent` / `signSession` / `attestAction` / `verifyProvenanceTrail` |

HMAC-SHA256 via Node `crypto` only; secrets injected at registration — never
hardcoded. Does **not** rewrite `src/core/consensus`.

## NON-CLAIM

≠ OAuth/OIDC/IAM · ≠ SAML IdP · ≠ PRODUCTION_READY=YES identity product ·
≠ CloudAgent · ≠ Fundacion writes · ≠ BN–BQ · ≠ reopen L17–L20

## Tests

`tests/eos-bm-agent-identity-attestation-port.test.js` — hermetic `node --test`
(~16). Excluded from SLIM (≤145) like BH/BK.

## Host

`MISSION_BM_BOOTSTRAP.ps1` — worktree pin StartsWith `1d8ff62`, branch, copy,
patch, `test:mission-bm`, SLIM≤145, `verify:strict`, commit, push.

# Proposal — Mission BM Agent Identity Attestation & Action Provenance Port (SPEC-0070)

## Why

Ladder 21 axis **Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric**
needs a typed, fail-closed **Agent Identity Attestation & Action Provenance Port**
that registers agents with injected HMAC secrets, signs hermetic sessions,
attests governed actions, and seals every outcome (OK / DENY) under evidence
custody after L20 (BH–BL) CLOSED/MEASURED. Without it, multi-agent identity
remains implicit in docs/runtime labels — not sealed BM-RCPT-* provenance.

## What changes

- New Layer-0 modules under `src/core/attestation/` (NEW dir; do NOT rewrite `consensus/`):
  - `agent-action-receipt.js` — sealed `BM-RCPT-*` receipts
  - `agent-identity-policy-gate.js` — fail-closed attestation policy
  - `agent-identity-attestation-port.js` — facade
    (`registerAgent`, `attestAction`, `verifyProvenanceTrail`, `signSession`)
- Hermetic tests `tests/eos-bm-agent-identity-attestation-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-bm.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0030, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- CloudAgent
- OAuth / OIDC / IAM / SAML IdP product claims
- BN–BQ implementation
- Reopening L17 / L18 / L19 / L20
- Rewriting `src/core/consensus`

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17 / L18 / L19 / L20 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L21 | OPEN (BM in progress; BN–BQ pending) |
| Axis | Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric |
| Antigravity-first | yes |
| SLIM | ≤145 (BM test excluded like BH/BK) |
| Base tip | `1d8ff62bcc262edfc6a1b3b23fd6c19162821117` (StartsWith `1d8ff62`) |

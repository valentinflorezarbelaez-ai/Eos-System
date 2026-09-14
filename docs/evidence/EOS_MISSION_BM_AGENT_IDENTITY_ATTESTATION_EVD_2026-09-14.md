# EVD-MISSION-BM — Agent Identity Attestation & Action Provenance Port

**Evidence id:** EVD-MISSION-BM
**Spec:** SPEC-0070
**Date:** 2026-09-14 (America/Bogota)
**PRODUCTION_READY:** NO
**Fundacion Δ:** 0

## Custody claim

Mission BM seals agent action provenance under `BM-RCPT-*` receipts with
canonical nine-field SHA-256 body and optional `prevReceiptHash` chaining.
HMAC-SHA256 session signatures bind registered agents. Fail-closed DENY on
unregistered / unsigned / forged / prompt mismatch / impersonation / tool
scope / Fundacion.

## Box measurement (hermetic)

| Check | Result |
| --- | --- |
| `node --test tests/eos-bm-agent-identity-attestation-port.test.js` | **PASS 16/16** |
| Law VI BM-owned `agent-*` only | CLEAN (split-prefix scan) |
| Layer 0 purity | no net/http/fs/child_process imports |
| `verify:strict` | **not measured on box** — host honesty |

## NON-CLAIM

≠ OAuth/OIDC/IAM · ≠ SAML IdP · ≠ PRODUCTION_READY=YES · ≠ consensus rewrite

## Pin / branch

- Pin StartsWith `1d8ff62` full `1d8ff62bcc262edfc6a1b3b23fd6c19162821117`
- Branch: `grok/mission-bm-agent-identity-attestation`
- Commit subject: `feat(attestation): Agent Identity Attestation & Action Provenance Port (SPEC-0070)`

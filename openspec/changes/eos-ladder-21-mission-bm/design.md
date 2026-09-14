# Design — Mission BM Agent Identity Attestation & Action Provenance Port (SPEC-0070)

## Overview

Layer-0 hermetic attestation port under NEW `src/core/attestation/`.
HMAC-SHA256 via `node:crypto` only; secrets injected at `registerAgent`
(never hardcoded). Fail-closed DENY + sealed failure receipt. Do NOT
rewrite `src/core/consensus`.

## Components

1. **Receipt** — nine-field SHA-256 seal:
   `{ receiptId, agentId, sessionSignature, promptHash, actionPayloadHash,
     toolScope, status, timestamp, prevReceiptHash }` → `BM-RCPT-*`
2. **Policy gate** — UNSIGNED_DENY, UNREGISTERED_AGENT, FORGED_SIGNATURE,
   PROMPT_MISMATCH, IMPERSONATION_DENY, TOOL_SCOPE_DENY, FUNDACION_ALWAYS_DENY,
   malformed DENY
3. **Port** — `createAgentIdentityAttestationPort({ now, hash })`
   - `registerAgent({ agentId, hmacSecret, allowedTools })`
   - `signSession({ agentId, sessionId })` — hermetic HMAC session signature
   - `attestAction(...)` — gate → HMAC verify → seal BM-RCPT-*
   - `verifyProvenanceTrail(receipts)` — hash + chain custody

## Crypto

- Algorithm: HMAC-SHA256 (`createHmac` + `timingSafeEqual`)
- Secrets: injected only via `registerAgent` in tests/host — never `sk-` /
  vendor token literals in source (Law VI)
- Optional future: ed25519 via same Node crypto surface — not required for BM DoD

## Constraints

- PRODUCTION_READY=NO; Fundacion Δ=0; Antigravity-first; Law VI CLEAN
- NO rewrite of consensus/; NO OAuth/OIDC/IAM product
- SLIM ≤145 via exclude of BM hermetic satellite test (like BH/BK)
- L17–L20 CLOSED never reopen; L21 OPEN

## NON-CLAIM

≠ OAuth/OIDC/IAM · ≠ SAML IdP · ≠ PRODUCTION_READY=YES identity product

# ADR-0030 — Mission BM Agent Identity Attestation & Action Provenance Port

- **Status:** Accepted — local governed
- **Date:** 2026-09-14
- **Deciders:** EOS local governed use (Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric)
- **Spec:** SPEC-0070

## Context

Ladder 21 audit (ADR-0029) ordered BM→BQ under axis **Sovereign Multi-Agent
Provenance & Continuous Sentinel Fabric**. L17/L18/L19/L20 remain
CLOSED_FOR_LOCAL_GOVERNED_USE and must never be reopened. L21 is OPEN
(BM in progress; BN–BQ pending).

Mission AA shipped multi-agent swarm. BH–BL shipped Sovereign Mission
Continuity & Operator Fabric (MEASURED / L20 CLOSED). Mission BM needs a
typed, hermetic **Agent Identity Attestation & Action Provenance Port** that
registers agents with injected HMAC secrets, signs sessions, attests
actions, and seals BM-RCPT-* receipts — without claiming OAuth/OIDC/IAM,
SAML IdP, or PRODUCTION_READY=YES identity product. `src/core/consensus`
already exists and MUST NOT be rewritten; BM lives in NEW
`src/core/attestation/`.

Base tip (expected): `1d8ff62bcc262edfc6a1b3b23fd6c19162821117`
(StartsWith `1d8ff62`; tip post-#298 / L21 OPEN). WARN-continue.

## Decision

1. Add three **new** modules under NEW `src/core/attestation/`:
   - `agent-action-receipt.js` — sealed `BM-RCPT-*` receipts (nine-field SHA-256)
   - `agent-identity-policy-gate.js` — unsigned / unregistered / forged /
     prompt mismatch / impersonation / tool scope / Fundacion DENY
   - `agent-identity-attestation-port.js` — facade
     (`createAgentIdentityAttestationPort`, `registerAgent`, `signSession`,
     `attestAction`, `verifyProvenanceTrail`)
2. Use hermetic HMAC-SHA256 via Node `crypto` only; secrets injected in
   tests via `registerAgent` — never hardcoded `sk-`/tokens (Law VI).
3. Seal every outcome (OK / DENY) with canonical nine-field SHA-256 body;
   chain `prevReceiptHash`; verify trails.
4. Keep `PRODUCTION_READY=NO`, Fundacion ALWAYS_DENY (`fundacionDelta=0`),
   Antigravity-first, Law VI CLEAN on BM-owned `agent-*` files only
   (sibling dirs may coexist — do not rewrite consensus/).
5. Exclude hermetic BM tests from SLIM (≤145) via CRLF-safe patcher
   (same pattern as BH/BK).

## Alternatives considered AND REJECTED

### A. Unauthenticated actions (no attestation port)

**Rejected.** Allowing multi-agent / mission actions without typed identity
attestation or sealed BM-RCPT-* provenance would soft-allow unsigned /
impersonated / unscoped actions and erase custody. Technical reason:
fail-closed DENY + sealed diagnostic receipt is the only honest outcome
for missing/invalid attestation.

### B. Heavy OAuth / JWT cloud identity product

**Rejected.** Shipping an OAuth/OIDC/IAM / JWT cloud IdP (or SAML federation
daemon) would claim identity-product completeness, require network listeners
and cloud credentials, and break Antigravity-first. Technical reason:
NON-CLAIM `oauthOidcIam=false` / `samlIdp=false` / `cloudAgent=false` /
`identityProduct=false`; port is local hermetic HMAC attestation custody,
not an IdP product.

### C. Post-hoc unverified logs

**Rejected.** Appending unstructured logs after the fact without sealed
receipts, HMAC session binding, or `prevReceiptHash` chaining would allow
tamper without detection and fail evidence custody. Technical reason:
canonical nine-field SHA-256 seal + trail verify is required for BM DoD.

## Consequences

- Payload ships ADR-0030 + evidence + OpenSpec (epistemic parity with BH/BK).
- Host bootstrap copies modules/tests/openspec/docs/patcher; runs
  `test:mission-bm`; holds SLIM≤145; runs verify:strict honestly (no fake
  check-count invention).
- BN–BQ remain pending; L17–L20 stay CLOSED forever relative to this ladder.
- PRODUCTION_READY stays NO; consensus/ untouched.

## NON-CLAIM

- ≠ OAuth / OIDC / IAM
- ≠ SAML IdP
- ≠ PRODUCTION_READY=YES identity product
- ≠ reopening L17 / L18 / L19 / L20
- ≠ BN–BQ implementation in this change
- ≠ rewrite of `src/core/consensus`

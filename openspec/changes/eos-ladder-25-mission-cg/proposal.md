# Proposal — Mission CG External Tool / MCP Federation Port (SPEC-0090)

## Why

Ladder 25 axis **Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric** needs a Layer-0 port that federates external tools / MCP surfaces with allowlists, sealed receipts, and Fundacion deny. Connectors exist ad hoc; EOS lacks the federation port (`CG-RCPT-*`).

## What changes

- New Layer-0 modules under `src/core/federation/`:
  - `external-tool-federation-receipt.js` — sealed `CG-RCPT-*` receipts
  - `external-tool-federation-policy-gate.js` — fail-closed federation preconditions
  - `external-tool-federation-port.js` — facade (`federate`, `verifyTrail`, `getFederation`)
- Hermetic tests `tests/eos-cg-external-tool-federation-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-cg.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0050, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- Unrestricted tool proxy / `*` allow-all
- Live MCP network calls inside the port
- CH–CK implementation
- Tip-refresh / freeze tip rewrite
- Reopening L17–L24

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L24 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L25 | OPEN (Audit MEASURED · CG in progress · CH–CK pending) |
| Axis | Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric |
| Antigravity-first | yes |
| Mode | Hermetic Layer-0 federation port (no live MCP) |

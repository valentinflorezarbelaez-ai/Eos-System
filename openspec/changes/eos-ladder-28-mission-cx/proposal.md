# Proposal — Mission CX Billing-Blocked Local Verify Ritual Port (SPEC-0107)

## Why

CQ seals billing-blocked local CI receipts, but EOS lacks an operator-facing Layer-0 **local verify ritual / runbook** port composing CQ BILLING_BLOCKED honesty with CR/CS/CT + HUD observe under explicit "local PASS ≠ GHA green" encoding. Ladder 28 axis needs this satellite after CW MEASURED.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `billing-blocked-local-verify-ritual-receipt.js` — sealed `CX-RCPT-*` + forced BILLING_BLOCKED
  - `billing-blocked-local-verify-ritual-policy-gate.js` — fail-closed govern preconditions
  - `billing-blocked-local-verify-ritual-port.js` — facade (`govern`, `evaluate`, `verifyTrail`, `getDecision`); soft-compose CQ + optional CR/CS/CT/CV/CW
- Hermetic tests `tests/eos-cx-billing-blocked-local-verify-ritual-port.test.js` (17)
- CRLF-safe patcher `scripts/patch-mission-cx.mjs`
- OpenSpec change, ADR-0078, evidence, release notes

## Non-goals

- GHA green claim; GHE enforcement; CQ rewrite; PRODUCTION_READY flip; Fundacion writes; reopen L27; tip rewrite;
  CY; tip-refresh; new schemas JSON; require live CQ–CW govern for happy path

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L27 | CLOSED — never reopen (NEVER reopen L27) |
| L28 | OPEN (Audit MEASURED · CV MEASURED · CW MEASURED · CX in progress · CY–CZ pending) |
| Axis | Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric |
| Freeze pin | `97d23ebc` (CW MEASURED; parent tip-refreshes post-CX) |
| Compose | CQ BILLING_BLOCKED observe + optional CR/CS/CT/CV/CW labels |
| Human gates | FUNDACION_ALWAYS_DENY + PRODUCTION_READY — refuse auto |
| Tip-refresh / CY | NOT this package |
| Local PASS | ≠ GHA green / ≠ GHE |

# Proposal — Mission CJ Continuous Adversarial Verification Port (SPEC-0093)

## Why

Ladder 25 axis **Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric** needs a Layer-0 scheduled adversarial probe port that challenges MEASURED claims with sealed findings. `verify:strict` exists; EOS lacks the Continuous Adversarial Verification Port (`CJ-RCPT-*`).

## What changes

- New Layer-0 modules under `src/core/verification/`:
  - `adversarial-verification-receipt.js` — sealed `CJ-RCPT-*` receipts
  - `adversarial-verification-policy-gate.js` — fail-closed probe preconditions
  - `adversarial-verification-port.js` — facade (`probe`, `verifyTrail`, `getProbe`)
- Hermetic tests `tests/eos-cj-adversarial-verification-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-cj.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0053, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- Red-team consulting product
- GH Enterprise enforcement claims / GH API
- CK implementation
- Tip-refresh / freeze tip rewrite
- Reopening L17–L24

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L24 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L25 | OPEN (Audit + CG + CH + CI MEASURED · CJ in progress · CK pending) |
| Axis | Sovereign External Tool Federation, Long-Horizon Mission Archive & Adversarial Verification Fabric |
| Antigravity-first | yes |
| Mode | Hermetic Layer-0 adversarial verification (no network / no GH API) |

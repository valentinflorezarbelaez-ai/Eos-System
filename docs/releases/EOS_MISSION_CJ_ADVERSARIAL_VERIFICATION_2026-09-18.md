# EOS Mission CJ Release Note — Continuous Adversarial Verification Port (SPEC-0093)

**Date:** 2026-09-18 (America/Bogota)  
**Mission:** CJ / SPEC-0093  
**Ladder:** 25 Satellite 4  
**Status:** CODE_READY (box); host apply / PR pending  
**PRODUCTION_READY:** NO  

## Summary

Adds Layer-0 Continuous Adversarial Verification Port under `src/core/verification/`:
`probe(plan)` → PASS|CHALLENGE|DENY with sealed `CJ-RCPT-*` receipts,
Fundacion ALWAYS_DENY, Law VI secret scan, hermetic MEASURED claim challenge.
Does NOT claim red-team consulting or GH Enterprise enforcement. No network / no GH API.

## Scripts

- `npm run test:mission-cj`
- `npm run test:adversarial-verification`

## Host wiring

```
node scripts/patch-mission-cj.mjs
```

Adds the scripts above and SLIM excludes `eos-cj-adversarial-verification-port.test.js`.

## Pins (honesty)

| Pin | Value |
| --- | --- |
| Live HEAD (#351) | `d6353fb46110ffbc2bc487c47321d7919f88efb5` |
| Freeze tip (UNCHANGED, CI #350) | `93c6fdaf4f72fa71fc5036ed7f601a69520640d6` |

Do **not** rewrite freeze/matrix/dirty-defer/m4 in this mission.

## NON-CLAIMS

- ≠ red-team consulting product
- ≠ claims GH Enterprise enforcement
- ≠ Fundacion writes (Δ=0)
- PRODUCTION_READY=NO
- ≠ tip-refresh; ≠ Mission CK

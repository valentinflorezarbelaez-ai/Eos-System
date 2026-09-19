# EOS Mission CM Release Note — Evidence Binding & Claim Custody Port (SPEC-0096)

**Date:** 2026-09-19 (America/Bogota)  
**Mission:** CM / SPEC-0096  
**Ladder:** 26 Satellite 2  
**Status:** CODE_READY (box); host apply / PR pending  
**PRODUCTION_READY:** NO  

## Summary

Adds Layer-0 Evidence Binding & Claim Custody Port under `src/core/evidence/`:
`bind(plan)` / `claim(plan)` → PASS|DENY with sealed `CM-RCPT-*` receipts,
Fundacion ALWAYS_DENY, Law VI secret scan, hermetic claimId↔evidenceDigest
binding with optional prior CL `linkDigest`.
Does NOT claim WORM SaaS, external audit product, SIEM, production data lake,
or GH Enterprise enforcement. No network / no GH API.

## Scripts

- `npm run test:mission-cm`
- `npm run test:evidence-binding`

## Host wiring

```
node scripts/patch-mission-cm.mjs
```

Adds the scripts above and SLIM excludes `eos-cm-evidence-binding-port.test.js`.

## Pins (honesty)

| Pin | Value |
| --- | --- |
| Live HEAD (after tip #359) | `b52ea529f3569825d4030ef20db34af6e50be364` |
| Freeze pin (UNCHANGED, Mission CL #358) | `acf069cec7f8b6db2c9fb81feb4b6482b6aca4a0` |

## NON-CLAIMS

- ≠ WORM SaaS
- ≠ external audit product
- ≠ SIEM retention SaaS / ≠ production data lake
- ≠ claims GH Enterprise enforcement
- ≠ Fundacion writes (Δ=0)
- PRODUCTION_READY=NO
- ≠ tip-refresh; ≠ Mission CN–CP

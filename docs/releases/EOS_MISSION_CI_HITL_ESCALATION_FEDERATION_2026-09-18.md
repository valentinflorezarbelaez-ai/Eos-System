# EOS Mission CI Release Note — Human Authority Escalation Federation Port (SPEC-0092)

**Date:** 2026-09-18 (America/Bogota)  
**Mission:** CI / SPEC-0092  
**Ladder:** 25 Satellite 3  
**Status:** CODE_READY (box); host apply / PR pending  
**PRODUCTION_READY:** NO  

## Summary

Adds Layer-0 Human Authority Escalation Federation Port under `src/core/authority/`:
`escalate(plan)` → ESCALATE|HOLD|DENY with sealed `CI-RCPT-*` receipts,
Fundacion ALWAYS_DENY, Law VI secret scan, irreversibility + human operator binding.
Does NOT auto-approve irreversible actions — human remains authority.

## Scripts

- `npm run test:mission-ci`
- `npm run test:hitl-escalation-federation`

## Host wiring

```
node scripts/patch-mission-ci.mjs
```

Adds the scripts above and SLIM excludes `eos-ci-hitl-escalation-federation-port.test.js`.

## Pins (honesty)

| Pin | Value |
| --- | --- |
| Live HEAD (#349) | `bf45cbeae613bdc47a391fa5cee859c71dc25dea` |
| Freeze tip (UNCHANGED, CH #348) | `5432f046d4b18843fac316bbd794c84339a5a86b` |

Do **not** rewrite freeze/matrix/dirty-defer/m4 in this mission.

## NON-CLAIMS

- ≠ autonomous approval of irreversible actions
- human remains authority
- ≠ Fundacion writes (Δ=0)
- PRODUCTION_READY=NO
- ≠ tip-refresh; ≠ Mission CJ

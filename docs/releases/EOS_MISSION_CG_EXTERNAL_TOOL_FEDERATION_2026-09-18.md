# EOS Mission CG Release Note — External Tool / MCP Federation Port (SPEC-0090)

**Date:** 2026-09-18 (America/Bogota)  
**Mission:** CG / SPEC-0090  
**Ladder:** 25 Satellite 1  
**Status:** CODE_READY (box); host apply / PR pending  
**PRODUCTION_READY:** NO  

## Summary

Adds Layer-0 External Tool / MCP Federation Port under `src/core/federation/`:
allowlist-bound `federate(plan)` → ALLOW|DENY with sealed `CG-RCPT-*` receipts,
Fundacion ALWAYS_DENY, Law VI secret scan, and rejection of unrestricted `*`.
Hermetic — no live MCP network calls.

## Scripts

- `npm run test:mission-cg`
- `npm run test:external-tool-federation`

## Host wiring

```
node scripts/patch-mission-cg.mjs
```

Adds the scripts above and SLIM excludes `eos-cg-external-tool-federation-port.test.js`.

## Pins (honesty)

| Pin | Value |
| --- | --- |
| Live HEAD (#345) | `4759079793555decd5547c912f16ead38b704669` |
| Freeze tip (UNCHANGED, #344) | `868490a0461e55842b53a761771e7bcdbbe6ab71` |

Do **not** rewrite freeze/matrix/dirty-defer/m4 in this mission.

## NON-CLAIMS

- ≠ unrestricted tool proxy
- ≠ Fundacion writes (Δ=0)
- ≠ PRODUCTION_READY=YES
- ≠ tip-refresh / ≠ CH
- L17–L24 CLOSED never reopen

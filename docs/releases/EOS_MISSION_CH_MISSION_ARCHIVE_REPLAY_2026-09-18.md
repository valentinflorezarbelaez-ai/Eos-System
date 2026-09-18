# EOS Mission CH Release Note — Long-Horizon Mission Archive & Replay Port (SPEC-0091)

**Date:** 2026-09-18 (America/Bogota)  
**Mission:** CH / SPEC-0091  
**Ladder:** 25 Satellite 2  
**Status:** CODE_READY (box); host apply / PR pending  
**PRODUCTION_READY:** NO  

## Summary

Adds Layer-0 Long-Horizon Mission Archive & Replay Port under `src/core/archive/`:
`archive(plan)` / `replay(plan)` → ARCHIVE|REPLAY|DENY with sealed `CH-RCPT-*` receipts,
Fundacion ALWAYS_DENY, Law VI secret scan, digest shape (64 hex), and rejection of empty trails.
Hermetic in-memory trail only — no disk lake / no SIEM.

## Scripts

- `npm run test:mission-ch`
- `npm run test:mission-archive-replay`

## Host wiring

```
node scripts/patch-mission-ch.mjs
```

Adds the scripts above and SLIM excludes `eos-ch-mission-archive-replay-port.test.js`.

## Pins (honesty)

| Pin | Value |
| --- | --- |
| Live HEAD (#347) | `b57bfc8fd849ab71f58d75cdeb0ecf0805de2dde` |
| Freeze tip (UNCHANGED, CG #346) | `cbe1c525a405fb6236bf3855a46934dc835196f3` |

Do **not** rewrite freeze/matrix/dirty-defer/m4 in this mission.

## NON-CLAIMS

- ≠ production data lake
- ≠ SIEM retention SaaS
- ≠ Fundacion writes (Δ=0)
- PRODUCTION_READY=NO
- ≠ tip-refresh; ≠ Mission CI

# EOS Mission CH Evidence — Long-Horizon Mission Archive & Replay Port (SPEC-0091)

**Date:** 2026-09-18 (America/Bogota, UTC-5)  
**Mission:** CH / SPEC-0091  
**Status:** MISSION_CH_CODE_READY (box package; host apply pending)  
**PRODUCTION_READY:** NO  
**Fundacion Δ:** 0  

## Deliverables (box)

| Path | Role |
| --- | --- |
| `src/core/archive/mission-archive-replay-receipt.js` | Nine-field `CH-RCPT-*` SHA-256 seal |
| `src/core/archive/mission-archive-replay-policy-gate.js` | Fail-closed archive/replay gate |
| `src/core/archive/mission-archive-replay-port.js` | `archive` / `replay` / `verifyTrail` / store |
| `tests/eos-ch-mission-archive-replay-port.test.js` | Hermetic suite (18) |
| `package.json` | `test:mission-ch`, `test:mission-archive-replay` |
| `scripts/test-runner.js` | SLIM exclude CH test (host merge via patcher) |
| `scripts/patch-mission-ch.mjs` | CRLF-safe host patcher |
| `docs/adrs/ADR-0051-…` | Architecture decision |
| `openspec/changes/eos-ladder-25-mission-ch/` | SpecBoot change |

## Hermetic checks (box)

```
node --test tests/eos-ch-mission-archive-replay-port.test.js
# tests 18 / pass 18 / fail 0
```

- Receipt: nine-field seal, SHA-256, tamper detect, PRODUCTION_READY=NO, CH-RCPT-*
- Policy: empty trail / bad digest / secrets / Fundacion / max entries
- Port: happy ARCHIVE; happy REPLAY of sealed trail; deny sealed receipts (empty, fundacion, secrets, bad digest, oversize)
- `verifyTrail` OK then BREAK on tamper
- NON-CLAIM: ≠ production data lake / ≠ SIEM retention SaaS / ≠ PRODUCTION_READY=YES
- Hermetic: in-memory trail only — no disk lake / no SIEM

## Pins

- Live main HEAD (tip refresh #347): `b57bfc8fd849ab71f58d75cdeb0ecf0805de2dde`
- Freeze tip UNCHANGED (CG #346): `cbe1c525a405fb6236bf3855a46934dc835196f3`

## Honesty

- L17–L24 CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen
- L25 OPEN (Audit + CG MEASURED · CH in progress · CI–CK pending)
- No tip-refresh; no Fundacion; no CI in this package
- Law VI: synthetic secrets via `String.fromCharCode` in tests
- L0: `node:crypto` only

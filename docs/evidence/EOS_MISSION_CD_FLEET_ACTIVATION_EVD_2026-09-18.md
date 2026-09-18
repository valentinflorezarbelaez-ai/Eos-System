# EOS Mission CD Evidence — Fleet Project Registry & Governed Activation Port (SPEC-0087)

**Date:** 2026-09-18 (America/Bogota, UTC-5)  
**Mission:** CD / SPEC-0087  
**Status:** MISSION_CD_CODE_READY (box package; host apply pending)  
**PRODUCTION_READY:** NO  
**Fundacion Δ:** 0  

## Deliverables (box)

| Path | Role |
| --- | --- |
| `src/core/projects/fleet-activation-receipt.js` | Nine-field `CD-RCPT-*` SHA-256 seal |
| `src/core/projects/fleet-activation-policy-gate.js` | Fail-closed SSOT/allowlist gate |
| `src/core/projects/fleet-activation-port.js` | `activate` / `verifyTrail` / store |
| `tests/eos-cd-fleet-activation-port.test.js` | Hermetic suite (18) |
| `package.json` | `test:mission-cd`, `test:fleet-activation` |
| `scripts/test-runner.js` | SLIM exclude CD test (host merge via patcher) |
| `scripts/patch-mission-cd.mjs` | CRLF-safe host patcher |
| `docs/adrs/ADR-0047-…` | Architecture decision |
| `openspec/changes/eos-ladder-24-mission-cd/` | SpecBoot change |

## Hermetic checks (box)

```
node --test tests/eos-cd-fleet-activation-port.test.js
# tests 18 / pass 18 / fail 0
```

- Receipt: nine-field seal, SHA-256, tamper detect, PRODUCTION_READY=NO, CD-RCPT-*
- Policy: empty / bad projectId / bad digest / unknown mission id / secrets / Fundacion / max allowlist
- Port: happy ALLOW; deny sealed receipts (empty, fundacion, secrets, bad digest, oversize)
- `verifyTrail` OK then BREAK on tamper
- NON-CLAIM: ≠ Kubernetes multi-cluster CP / ≠ Fundacion / ≠ PRODUCTION_READY=YES

## Pins

- Live main HEAD (tip refresh #337): `a748d5116fd53a5a0eac23ddd7af9e50820ab0b1`
- Freeze/matrix tip pin UNCHANGED (CC #336): `94b26b90f59a6308d292c54944cee7f521fa3bb3`

## Honesty

- L17–L23 CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen
- L24 OPEN (Audit + CB + CC MEASURED · CD in progress · CE–CF pending)
- No tip-refresh; no Fundacion; no CE–CF in this package
- Law VI: synthetic secrets via `String.fromCharCode` in tests
- L0: `node:crypto` only

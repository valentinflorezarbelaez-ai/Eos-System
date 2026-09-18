# EOS Mission CG Evidence — External Tool / MCP Federation Port (SPEC-0090)

**Date:** 2026-09-18 (America/Bogota, UTC-5)  
**Mission:** CG / SPEC-0090  
**Status:** MISSION_CG_CODE_READY (box package; host apply pending)  
**PRODUCTION_READY:** NO  
**Fundacion Δ:** 0  

## Deliverables (box)

| Path | Role |
| --- | --- |
| `src/core/federation/external-tool-federation-receipt.js` | Nine-field `CG-RCPT-*` SHA-256 seal |
| `src/core/federation/external-tool-federation-policy-gate.js` | Fail-closed federation gate |
| `src/core/federation/external-tool-federation-port.js` | `federate` / `verifyTrail` / store |
| `tests/eos-cg-external-tool-federation-port.test.js` | Hermetic suite (19) |
| `package.json` | `test:mission-cg`, `test:external-tool-federation` |
| `scripts/test-runner.js` | SLIM exclude CG test (host merge via patcher) |
| `scripts/patch-mission-cg.mjs` | CRLF-safe host patcher |
| `docs/adrs/ADR-0050-…` | Architecture decision |
| `openspec/changes/eos-ladder-25-mission-cg/` | SpecBoot change |

## Hermetic checks (box)

```
node --test tests/eos-cg-external-tool-federation-port.test.js
# tests 19 / pass 19 / fail 0
```

- Receipt: nine-field seal, SHA-256, tamper detect, PRODUCTION_READY=NO, CG-RCPT-*
- Policy: empty / unrestricted * / unknown outside allowlist / secrets / Fundacion / max tools
- Port: happy ALLOW (allowlist covers tools); deny sealed receipts (empty, *, fundacion, secrets, outside allowlist, oversize)
- `verifyTrail` OK then BREAK on tamper
- NON-CLAIM: ≠ unrestricted tool proxy / ≠ Fundacion writes / ≠ PRODUCTION_READY=YES
- Hermetic: no live MCP network calls

## Pins

- Live main HEAD (tip refresh #345): `4759079793555decd5547c912f16ead38b704669`
- Freeze tip UNCHANGED (L25 Audit #344): `868490a0461e55842b53a761771e7bcdbbe6ab71`

## Honesty

- L17–L24 CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen
- L25 OPEN (Audit MEASURED · CG in progress · CH–CK pending)
- No tip-refresh; no Fundacion; no CH in this package
- Law VI: synthetic secrets via `String.fromCharCode` in tests
- L0: `node:crypto` only

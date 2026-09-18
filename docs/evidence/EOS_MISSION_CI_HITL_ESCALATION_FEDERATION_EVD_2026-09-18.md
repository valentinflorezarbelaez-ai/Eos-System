# EOS Mission CI Evidence — Human Authority Escalation Federation Port (SPEC-0092)

**Date:** 2026-09-18 (America/Bogota, UTC-5)  
**Mission:** CI / SPEC-0092  
**Status:** MISSION_CI_CODE_READY (box package; host apply pending)  
**PRODUCTION_READY:** NO  
**Fundacion Δ:** 0  

## Deliverables (box)

| Path | Role |
| --- | --- |
| `src/core/authority/hitl-escalation-federation-receipt.js` | Nine-field `CI-RCPT-*` SHA-256 seal |
| `src/core/authority/hitl-escalation-federation-policy-gate.js` | Fail-closed escalation gate |
| `src/core/authority/hitl-escalation-federation-port.js` | `escalate` / `verifyTrail` / store |
| `tests/eos-ci-hitl-escalation-federation-port.test.js` | Hermetic suite (19) |
| `package.json` | `test:mission-ci`, `test:hitl-escalation-federation` |
| `scripts/test-runner.js` | SLIM exclude CI test (host merge via patcher) |
| `scripts/patch-mission-ci.mjs` | CRLF-safe host patcher |
| `docs/adrs/ADR-0052-…` | Architecture decision |
| `openspec/changes/eos-ladder-25-mission-ci/` | SpecBoot change |

## Hermetic checks (box)

```
node --test tests/eos-ci-hitl-escalation-federation-port.test.js
# tests 19 / pass 19 / fail 0
```

- Receipt: nine-field seal, SHA-256, tamper detect, PRODUCTION_READY=NO, CI-RCPT-*
- Policy: missing ids / missing operator irreversible / auto-approve irreversible / secrets / Fundacion / max reasons
- Port: happy ESCALATE (APPROVE reversible); HOLD (DEFER); deny sealed receipts (missing operator, auto-approve, fundacion, secrets, oversize)
- `verifyTrail` OK then BREAK on tamper
- NON-CLAIM: ≠ autonomous approval of irreversible / human remains authority / ≠ PRODUCTION_READY=YES
- Hermetic: does NOT auto-approve irreversible

## Pins

- Live main HEAD (tip refresh #349): `bf45cbeae613bdc47a391fa5cee859c71dc25dea`
- Freeze tip UNCHANGED (CH #348): `5432f046d4b18843fac316bbd794c84339a5a86b`

## Honesty

- L17–L24 CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen
- L25 OPEN (Audit + CG + CH MEASURED · CI in progress · CJ–CK pending)
- No tip-refresh; no Fundacion; no CJ in this package
- Law VI: synthetic secrets via `String.fromCharCode` in tests
- L0: `node:crypto` only

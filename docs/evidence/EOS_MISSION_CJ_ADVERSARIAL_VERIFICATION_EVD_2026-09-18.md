# EOS Mission CJ Evidence — Continuous Adversarial Verification Port (SPEC-0093)

**Date:** 2026-09-18 (America/Bogota, UTC-5)  
**Mission:** CJ / SPEC-0093  
**Status:** MISSION_CJ_CODE_READY (box package; host apply pending)  
**PRODUCTION_READY:** NO  
**Fundacion Δ:** 0  

## Deliverables (box)

| Path | Role |
| --- | --- |
| `src/core/verification/adversarial-verification-receipt.js` | Nine-field `CJ-RCPT-*` SHA-256 seal |
| `src/core/verification/adversarial-verification-policy-gate.js` | Fail-closed probe gate |
| `src/core/verification/adversarial-verification-port.js` | `probe` / `verifyTrail` / store |
| `tests/eos-cj-adversarial-verification-port.test.js` | Hermetic suite (19) |
| `package.json` | `test:mission-cj`, `test:adversarial-verification` |
| `scripts/test-runner.js` | SLIM exclude CJ test (host merge via patcher) |
| `scripts/patch-mission-cj.mjs` | CRLF-safe host patcher |
| `docs/adrs/ADR-0053-…` | Architecture decision |
| `openspec/changes/eos-ladder-25-mission-cj/` | SpecBoot change |

## Hermetic checks (box)

```
node --test tests/eos-cj-adversarial-verification-port.test.js
# tests 19 / pass 19 / fail 0
```

- Receipt: nine-field seal, SHA-256, tamper detect, PRODUCTION_READY=NO, CJ-RCPT-*
- Policy: empty / missing probeId / missing targets / invalid claim status / oversize / secrets / Fundacion / GHE claim labels
- Port: happy PASS (consistent MEASURED); CHALLENGE (weak evidence); DENY (missing/tampered digest, empty, fundacion, secrets, bad claim, GHE, oversize, bad hex)
- `verifyTrail` OK then BREAK on tamper
- NON-CLAIM: ≠ red-team consulting product / ≠ GHE enforcement / ≠ PRODUCTION_READY=YES
- Hermetic: no network / no GH API

## Pins

- Live main HEAD (tip refresh #351): `d6353fb46110ffbc2bc487c47321d7919f88efb5`
- Freeze tip UNCHANGED (CI #350): `93c6fdaf4f72fa71fc5036ed7f601a69520640d6`

## Honesty

- L17–L24 CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen
- L25 OPEN (Audit + CG + CH + CI MEASURED · CJ in progress · CK pending)
- No tip-refresh; no Fundacion; no CK in this package
- Law VI: synthetic secrets via `String.fromCharCode` in tests
- L0: `node:crypto` only

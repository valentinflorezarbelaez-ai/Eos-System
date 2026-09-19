# EOS Mission CM Evidence — Evidence Binding & Claim Custody Port (SPEC-0096)

**Date:** 2026-09-19 (America/Bogota, UTC-5)  
**Mission:** CM / SPEC-0096  
**Status:** MISSION_CM_CODE_READY (box package; host apply pending)  
**PRODUCTION_READY:** NO  
**Fundacion Δ:** 0  

## Deliverables (box)

| Path | Role |
| --- | --- |
| `src/core/evidence/evidence-binding-receipt.js` | Nine-field `CM-RCPT-*` SHA-256 seal |
| `src/core/evidence/evidence-binding-policy-gate.js` | Fail-closed bind gate |
| `src/core/evidence/evidence-binding-port.js` | `bind` / `claim` / `verifyTrail` / store |
| `tests/eos-cm-evidence-binding-port.test.js` | Hermetic suite (18) |
| `package.json` | `test:mission-cm`, `test:evidence-binding` |
| `scripts/test-runner.js` | SLIM exclude CM test (host merge via patcher) |
| `scripts/patch-mission-cm.mjs` | CRLF-safe host patcher |
| `docs/adrs/ADR-0057-…` | Architecture decision |
| `openspec/changes/eos-ladder-26-mission-cm/` | SpecBoot change |

## Hermetic checks (box)

```
node --test tests/eos-cm-evidence-binding-port.test.js
# tests 18 / pass 18 / fail 0
```

```
node --check src/core/evidence/evidence-binding-*.js
node --check tests/eos-cm-evidence-binding-port.test.js
# clean
```

- Receipt: nine-field seal, SHA-256, tamper detect, PRODUCTION_READY=NO, CM-RCPT-*
- Policy: empty / missing planId / missing claims / missing digest / oversize / secrets / Fundacion / WORM·audit·SIEM·data-lake·GHE claim labels / bad+tampered digests
- Port: happy PASS (claimId↔evidenceDigest + CL linkDigest); claim alias (digest-only); DENY (empty, fundacion, secrets, missing digest, claims, oversize, bad/tampered hex)
- `verifyTrail` OK then BREAK on tamper
- NON-CLAIM: ≠ WORM SaaS / ≠ external audit product / ≠ GHE / ≠ PRODUCTION_READY=YES
- Hermetic: no network / no GH API

## Pins

- Live main HEAD (after tip #359): `b52ea529f3569825d4030ef20db34af6e50be364`
- Freeze pin (Mission CL #358): `acf069cec7f8b6db2c9fb81feb4b6482b6aca4a0`

## Honesty

- L17–L25 CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen; NEVER reopen L25
- L26 OPEN (Audit + CL MEASURED · CM in progress · CN–CP pending)
- No tip-refresh; no Fundacion; no CN–CP in this package
- Law VI: synthetic secrets via `String.fromCharCode` in tests
- L0: `node:crypto` only

# EOS Mission CL Evidence — Spec↔Code Traceability Graph Port (SPEC-0095)

**Date:** 2026-09-19 (America/Bogota, UTC-5)  
**Mission:** CL / SPEC-0095  
**Status:** MISSION_CL_CODE_READY (box package; host apply pending)  
**PRODUCTION_READY:** NO  
**Fundacion Δ:** 0  

## Deliverables (box)

| Path | Role |
| --- | --- |
| `src/core/traceability/spec-code-traceability-receipt.js` | Nine-field `CL-RCPT-*` SHA-256 seal |
| `src/core/traceability/spec-code-traceability-policy-gate.js` | Fail-closed link gate |
| `src/core/traceability/spec-code-traceability-port.js` | `link` / `trace` / `verifyTrail` / store |
| `tests/eos-cl-spec-code-traceability-port.test.js` | Hermetic suite (18) |
| `package.json` | `test:mission-cl`, `test:spec-code-traceability` |
| `scripts/test-runner.js` | SLIM exclude CL test (host merge via patcher) |
| `scripts/patch-mission-cl.mjs` | CRLF-safe host patcher |
| `docs/adrs/ADR-0056-…` | Architecture decision |
| `openspec/changes/eos-ladder-26-mission-cl/` | SpecBoot change |

## Hermetic checks (box)

```
node --test tests/eos-cl-spec-code-traceability-port.test.js
# tests 18 / pass 18 / fail 0
```

```
node --check src/core/traceability/spec-code-traceability-*.js
node --check tests/eos-cl-spec-code-traceability-port.test.js
# clean
```

- Receipt: nine-field seal, SHA-256, tamper detect, PRODUCTION_READY=NO, CL-RCPT-*
- Policy: empty / missing planId / missing nodes / invalid surface / oversize / secrets / Fundacion / LSP·IDE / GitHub-code-search / GHE claim labels / bad evidenceDigest
- Port: happy PASS (SPEC↔codePath); trace alias (moduleId); DENY (empty, fundacion, secrets, bad surface, claims, oversize, bad hex)
- `verifyTrail` OK then BREAK on tamper
- NON-CLAIM: ≠ full LSP/IDE / ≠ GitHub code search / ≠ GHE / ≠ PRODUCTION_READY=YES
- Hermetic: no network / no GH API

## Pins

- Live main HEAD (after tip #357): `12785c97dd4402ed2e56e4131d22c249bf979f6f`
- Freeze pin (L26 Audit #356): `045afdf0428357a80a432cfe4abb322016022f96`


## Honesty

- L17–L25 CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen; NEVER reopen L25
- L26 OPEN (Audit MEASURED · CL in progress · CM–CP pending)
- No tip-refresh; no Fundacion; no CM–CP in this package
- Law VI: synthetic secrets via `String.fromCharCode` in tests
- L0: `node:crypto` only

# Mission T-gate — External Project Write-Barrier Gateway L2 (SPEC-0025a) — 2026-09-11

## Summary

Fail-closed **Level-2 external write gateway** that validates six preconditions
then authorizes writes against a **hermetic fixture project root** only. New
module `src/core/governance/external-write-gateway.js` — additive overlay over
write-barrier; **does not** open real Documents/Fundacion, **does not** flip
PRODUCTION_READY, **does not** use CloudAgent.

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — real Fundacion paths ALWAYS DENIED (`FUNDACION_ALWAYS_DENY` / ADR-0013) |
| Gateway allow | **≠** Fundacion Δ=0 flipped |
| Hermetic fixture | **≠** production Fundacion (`C:\Users\valen\Documents\Fundacion`) |
| Level-2 receipts | **≠** PRODUCTION_READY |
| PRODUCTION_READY | **`NO`** (never YES) |
| write-barrier always-deny | **intact** — gateway does not mutate `src/core/write-barrier/*` |
| CloudAgent | **out** — Antigravity-first / box-only |
| App Fuerza / Fundacion trees on disk | **untouched** |

## Routing

| Signal | Path |
| --- | --- |
| Lifecycle | `createExternalWriteGateway` → assertPreconditions / authorizeExternalWrite / runGovernedWrite / health / status |
| Preconditions | REGISTERED, INTAKE_COMPLETE, SPEC_APPROVED, AUDIT_COMPLETE, OWNER_APPROVAL, LEVEL_2_AUTHORIZED |
| Fundacion | `denyRealFundacion` / `defaultIsRealFundacionPath` → always `FUNDACION_ALWAYS_DENY` |
| Fixture | `isHermeticFixturePath` — allow only inside `fixtureRoot` |
| Governed write | authorize → applyDiff → runVerifier; fail → rollbackDiff |
| AGY / CloudAgent | **NON-CLAIM** — no CloudAgent |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/governance/external-write-gateway.js` | **NEW** |
| `tests/governance/external-write-gateway.test.js` | **NEW** |
| `src/core/write-barrier/*` | **No** (prefer) |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude |
| OpenSpec + release + bootstrap | **Yes** |

## Verification (box harness)

```
cd /workspace/mission-t/harness && node --test tests/governance/external-write-gateway.test.js
```

→ **11 PASS**, 1 SKIP, 0 FAIL (T1–T11 + T12 SKIP)

Slim exclude `external-write-gateway.test.js` + `npm run test:external-write-gateway` / `test:mission-t`.

## Cases

| ID | Result |
| --- | --- |
| T1 PRODUCTION_READY=NO + kind | PASS |
| T2 missing precondition → EXTERNAL_WRITE_PRECONDITION_FAILED | PASS |
| T3 all 6 + fixture path → allow | PASS |
| T4 all 6 + real Fundacion-looking path → FUNDACION_ALWAYS_DENY | PASS |
| T5 path outside fixture → OUTSIDE_HERMETIC_FIXTURE | PASS |
| T6 governed write happy path + receipt hash | PASS |
| T7 verifier fail → rollback called + fail-closed | PASS |
| T8 apply fail → no false success | PASS |
| T9 partial preconditions list each missing key | PASS |
| T10 health never claims Fundacion Δ opened / PRODUCTION_READY yes | PASS |
| T11 NON-CLAIM source strings | PASS |
| T12 Optional live real Fundacion | SKIP |

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)
- Base tip Expected: `d88a5b4b45daaa200618f41ab52402f1cfaf8dae`
- **NON-CLAIM:** ≠ Fundacion Δ opened; ≠ production Fundacion writes; ≠ PRODUCTION_READY yes; ≠ CloudAgent

## Branch

`grok/mission-t-external-write-gateway`

## Payload

`/workspace/Eos-mission-t-payload/` (host: `C:\Users\valen\Documents\Eos-mission-t-payload`)

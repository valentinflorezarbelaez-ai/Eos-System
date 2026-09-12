# Mission V — Autonomous FDIR Remediation Loop (SPEC-0027) — 2026-09-11

## Summary

Governed FDIR **remediation loop** that runs diagnose → remediate → verify with
a bounded `maxAttempts` budget, seals SHA-256 audit receipts each cycle
(sealEvd / SpecBoot hashing style), optionally gates remediations through a
Mission R–style sentinel (quarantine unauthorized mutations / orphans), and
fail-closed escalates to **ESCALATED_HITL** when the budget is exhausted.
New module `src/core/fdir/fdir-remediation-loop.js` — **not** PRODUCTION_READY,
**not** agy-daemon, **not** a rewrite of Mission R sentinel.

## Routing

| Signal | Path |
| --- | --- |
| Lifecycle | `createFdirRemediationLoop` → start/run/status/health/getReceipts/reset |
| Ports | Injected `diagnose` / `remediate` / `verify` (required) |
| Optional gate | `sentinel.checkRemediation` + `sentinel.quarantine` |
| Receipts | In-memory audit with `sha256` / `bodySha256` (64-hex) |
| AGY T7/U5 | **NON-CLAIM** — kind=`eos-fdir-remediation-loop` |
| Mission R | Consumes optional sentinel; does not rewrite fdir-sentinel-runtime.js |
| ATS | Non-claim |

## State machine

`IDLE → RUNNING → DIAGNOSING → REMEDIATING → REVERIFYING → RESOLVED | ESCALATED_HITL`

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/fdir/fdir-remediation-loop.js` | **NEW** |
| `tests/fdir/fdir-remediation-loop.test.js` | **NEW** |
| `src/core/fdir/fdir-sentinel-runtime.js` | **No** (not rewritten) |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |

## Verification (box harness)

```
cd /workspace/mission-v/harness && node --test tests/fdir/fdir-remediation-loop.test.js
```

→ **13 PASS**, 0 SKIP, 0 FAIL

Slim exclude `fdir-remediation-loop.test.js` + `npm run test:fdir-remediation` / `test:mission-v`.

## Cases

| ID | Result |
| --- | --- |
| V1 nominal resolve attempt 1 | PASS |
| V2 recover on attempt 2 | PASS |
| V3 exhaust budget → ESCALATED_HITL | PASS |
| V4 sentinel quarantine path | PASS |
| V5 maxAttempts clamp ≥1 | PASS |
| V6 diagnose/remediate/verify port wiring | PASS |
| V7 audit receipt SHA-256 present | PASS |
| V8 PRODUCTION_READY NO | PASS |
| V9 kind check | PASS |
| V10 missing ports fail-closed | PASS |
| V11 state transitions honest | PASS |
| V12 diagnose throw → escalate | PASS |
| V13 NON-CLAIM source strings | PASS |

## Package scripts (exact)

```json
"test:fdir-remediation": "node --test tests/fdir/fdir-remediation-loop.test.js",
"test:mission-v": "node --test tests/fdir/fdir-remediation-loop.test.js"
```

SLIM_SUITE_EXCLUDES entry: `'fdir-remediation-loop.test.js'`

Applied on host by `scripts/patch-mission-v.mjs` (idempotent).

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)
- Base tip Expected: `24c9845` (post #176+#177 Ladder 11 closed)
- No AI commit attribution / no Co-Authored-By
- **NON-CLAIM vs AGY:** ≠ agy-daemon; does not claim DAEMON_PRESENT
- **NON-CLAIM vs Mission R:** does not rewrite fdir-sentinel-runtime.js

## Branch

`grok/mission-v-fdir-remediation-loop`

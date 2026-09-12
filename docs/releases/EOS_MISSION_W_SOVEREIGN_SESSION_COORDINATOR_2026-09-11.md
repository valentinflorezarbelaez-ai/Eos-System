# Mission W — Sovereign Session Coordinator (SPEC-0028) — 2026-09-11

## Summary

Governed **sovereign session coordinator** that orchestrates Mission Q/R/S/T/V
ports via injection (worker daemon, FDIR sentinel, SpecBoot, external write
gateway, FDIR remediation loop) without rewriting those modules. Opens a
session (boot daemons), dispatches OpenSpec changes, auto-invokes remediation
(≤3) on APPLY/VERIFY failure, drains workers on close (`drain:true`), and seals
a consolidated EVD custody receipt (SHA-256). New module
`src/core/session/sovereign-session-coordinator.js` — **not** PRODUCTION_READY,
**not** agy-daemon, **not** a rewrite of Q/R/S/T/V.

## Routing

| Signal | Path |
| --- | --- |
| Lifecycle | `createSovereignSessionCoordinator` → openSession/startSession / runChange / closeSession/seal / health/getState |
| Ports | Injected `workerDaemon` / `sentinel` / `specboot` / `remediation` / `writeGateway` |
| Remediation | On SpecBoot APPLY/VERIFY fail → remediation ≤3 → else ESCALATED_HITL |
| Receipts | In-memory audit + consolidated EVD with `sha256` custody |
| AGY T7/U5 | **NON-CLAIM** — kind=`eos-sovereign-session-coordinator` |
| Q/R/S/T/V | Consumes via injection; does not rewrite those modules |
| ATS | Non-claim |

## State machine

`IDLE → INITIALIZING → SESSION_ACTIVE → CLOSING → SEALED → COMPLETED | ESCALATED_HITL`

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/session/sovereign-session-coordinator.js` | **NEW** |
| `tests/session/sovereign-session-coordinator.test.js` | **NEW** |
| Mission Q/R/S/T/V modules | **No** (not rewritten) |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |

## Verification (box harness)

```
cd /workspace/Eos-mission-w-payload && node --test tests/session/sovereign-session-coordinator.test.js
```

→ **14 PASS**, 0 SKIP, 0 FAIL

Slim exclude `sovereign-session-coordinator.test.js` + `npm run test:sovereign-session` / `test:mission-w`.

## Cases

| ID | Result |
| --- | --- |
| W1 happy path open→run→seal→COMPLETED | PASS |
| W2 INITIALIZING boots worker+sentinel | PASS |
| W3 APPLY fail then remediation resolves | PASS |
| W4 remediation exhaust → ESCALATED_HITL | PASS |
| W5 CLOSING drains worker with drain:true | PASS |
| W6 SEALED emits EVD sha256 custody receipt | PASS |
| W7 writeGateway deny/rollback path | PASS |
| W8 PRODUCTION_READY NO + kind | PASS |
| W9 missing ports fail-closed | PASS |
| W10 state machine honesty | PASS |
| W11 sentinel quarantine during session | PASS |
| W12 startSession alias + clamp | PASS |
| W13 NON-CLAIM source strings | PASS |
| W14 close after escalate still seals EVD | PASS |

## Package scripts (exact)

```json
"test:sovereign-session": "node --test tests/session/sovereign-session-coordinator.test.js",
"test:mission-w": "node --test tests/session/sovereign-session-coordinator.test.js"
```

SLIM_SUITE_EXCLUDES entry: `'sovereign-session-coordinator.test.js'`

Applied on host by `scripts/patch-mission-w.mjs` (idempotent).

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)
- Base tip Expected: `d3667cd` (Mission V on main)
- No AI commit attribution / no Co-Authored-By
- **NON-CLAIM vs AGY:** ≠ agy-daemon; does not claim DAEMON_PRESENT
- **NON-CLAIM vs Q/R/S/T/V:** does not rewrite those modules — injection only

## Branch

`grok/mission-w-sovereign-session-coordinator`

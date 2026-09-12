# Mission S — Autonomous SpecBoot Agent Runner (SPEC-0024) — 2026-09-11

## Summary

Governed SpecBoot **agent runner** that reads an OpenSpec change (`proposal.md` +
`tasks.md`), walks phases PROPOSE → APPLY → VERIFY → ARCHIVE → COMMIT_READY,
dispatches atomic apply tasks through an injected Mission P loop-compute
orchestration port (optionally wired to Mission Q `bindExecuteComputeRun`),
writes cryptographic evidence receipts under `docs/evidence/EVD-XXXX.json`, and
closes change delta metadata — **without** autonomous main merge. New module
`src/core/specboot/specboot-agent-runner.js` — **not** a second SpecBoot pipeline
replacing `node bin/eos.js` / AGY skills, **not** CloudAgent, **not** PRODUCTION_READY.

## Routing

| Signal | Path |
| --- | --- |
| Lifecycle | `createSpecbootAgentRunner` → loadChange / runPhase / runCycle / status / health / getReceipts |
| Apply port | Injected `runOrchestration` (Mission P `runLoopComputeOrchestration` or thin mock) |
| Optional Q wire | `bindExecuteComputeRun(workerDaemon)` → `executeComputeRun` on orch ctx |
| Evidence | `writeEvidence` → `docs/evidence/EVD-XXXX.json` (sha256, changeId, phase, taskIds, PRODUCTION_READY:NO) |
| Archive | Injected `archiveChange` meta only — `mergedToMain=false` |
| Commit | COMMIT_READY = ready-for-HITL-PR; no push/merge |
| AGY / CloudAgent | **NON-CLAIM** — ceremony SSOT remains skills/commands; CloudAgent out |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/specboot/specboot-agent-runner.js` | **NEW** |
| `tests/specboot/specboot-agent-runner.test.js` | **NEW** |
| `mission-loop.js` / `eos-compute-worker.js` | **No** |
| `loop-compute-orchestrator.js` / `worker-runtime-daemon.js` | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude |
| OpenSpec + release + bootstrap | **Yes** |

## Verification (box harness)

```
cd /workspace/mission-s/harness && node --test tests/specboot/specboot-agent-runner.test.js
```

→ **12 PASS**, 1 SKIP, 0 FAIL (S1–S12 + S13 SKIP)

Slim exclude `specboot-agent-runner.test.js` + `npm run test:specboot-agent` / `test:mission-s`.

## Cases

| ID | Result |
| --- | --- |
| S1 PRODUCTION_READY=NO + kind | PASS |
| S2 loadChange parses proposal + checkboxes | PASS |
| S3 invalid change → SPECBOOT_CHANGE_INVALID | PASS |
| S4 APPLY dispatches each pending task once | PASS |
| S5 APPLY fail-closed SPECBOOT_APPLY_FAILED | PASS |
| S6 VERIFY without evidence denied | PASS |
| S7 happy path EVD written + COMMIT_READY HITL | PASS |
| S8 ARCHIVE no main-merge side effect | PASS |
| S9 COMMIT_READY no push | PASS |
| S10 health never claims CloudAgent / PR yes | PASS |
| S11 optional bindExecuteComputeRun wire | PASS |
| S12 parseTasks + hash helpers | PASS |
| S13 Optional live soak | SKIP |

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)
- Base tip Expected: `748bffd45b0c7c899595417cd324649bf1732d00` (Mission R merge; tip-170 may land later — warn if differs)
- **NON-CLAIM:** ≠ second SpecBoot engine; ≠ CloudAgent; ≠ autonomous main merge

## Branch

`grok/mission-s-specboot-agent-runner`

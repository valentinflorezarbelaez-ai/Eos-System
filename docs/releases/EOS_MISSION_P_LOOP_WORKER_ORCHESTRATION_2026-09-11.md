# Mission P — Loop × Worker orchestration (SPEC-0021) — 2026-09-11

## Summary

Governed overlay binding the MCP Mission Loop (Intent→Spec→Plan→Act→Evidence→Verify→Archive) to `executeComputeRun` multi-native compose. New module `src/core/orchestration/loop-compute-orchestrator.js` advances stages legally, runs compute only at Act, records act/evidence/verify receipts (toolOutputs + custody hashes), blocks Archive on soft Browser QA until HITL, and fail-closes on infra `*_TOOL_FAILED` (never Archives).

## Routing

| Signal | Path |
| --- | --- |
| Stage SSOT | `mission-loop.js` (`evaluateStageTransition`, `assertArchiveAllowed`, `assertVerifyAdvanceAllowed`) |
| Compute | `executeComputeRun` + `buildMultiNativeComposeToolCalls` (Mission N) |
| Soft QA HITL | `ARCHIVE_REQUIRES_HITL_SOFT_QA` unless `hitlReceipt.ok` / `allowArchiveDespiteSoftQa` |
| Tool stage gate | Orchestrator-local `LOOP_COMPUTE_TOOL_STAGES['eos.compute.run'] → Act` |
| ATS | Non-claim — no mission-package.phase writes |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/orchestration/loop-compute-orchestrator.js` | **NEW** |
| `tests/orchestration/loop-compute-orchestrator.test.js` | **NEW** |
| `src/core/mcp/mission-loop.js` | **No** (overlay SSOT only) |
| `scripts/runners/eos-compute-worker.js` | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude |
| OpenSpec + release | **Yes** |

## Verification (box harness)

```
cd /workspace/mission-p/harness && node --test tests/orchestration/loop-compute-orchestrator.test.js
```

→ **11 PASS**, 1 SKIP, 0 FAIL

Slim exclude `loop-compute-orchestrator.test.js` + `npm run test:loop-compute` / `test:mission-p`.

## Cases

| ID | Result |
| --- | --- |
| P1 PRODUCTION_READY=NO + Act-only tool gate | PASS |
| P2 Happy path Archive + receipts | PASS |
| P3 Illegal Plan→Evidence skip | PASS |
| P4 Gemini infra → GEMINI_TOOL_FAILED | PASS |
| P5 Soft QA → HITL required | PASS |
| P6 Soft QA + hitlReceipt → Archive | PASS |
| P7 Verify fail → Archive denied | PASS |
| P8 Evidence→Verify without receipt | PASS |
| P9 applyDiff skipped on infra fail | PASS |
| P10 Dispatcher not required (pure-native) | PASS |
| P11 Custody/toolOutputs hashed in evidence | PASS |
| P12 Optional live | SKIP |

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)
- Base tip Expected: `86d715b7a171ca1998522d6904afe63b7bdf4f1c`

## Branch

`grok/mission-p-loop-worker-orchestration`

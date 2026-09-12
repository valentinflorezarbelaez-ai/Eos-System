# Design — Mission P (SPEC-0021)

## Architecture

```
createInitialLoopState
  → Intent→Spec→Plan→Act (evaluateStageTransition adjacency only)
  → Act: executeComputeRun(toolCalls from buildMultiNativeComposeToolCalls | explicit)
  → receipts: act (status + toolOutput hashes), evidence (hashes + custody), verify
  → soft QA (toolOutputs QA ok:true && result.ok===false): hitlRequired; Archive blocked
    unless hitlReceipt.ok===true | allowArchiveDespiteSoftQa
  → infra *_TOOL_FAILED: stop; never Archive
  → verify ok + assertArchiveAllowed → Archive
```

## Controls

| ID | Control |
|----|---------|
| P1 | PRODUCTION_READY=NO (orchestrator constant) |
| P2 | Happy path legal advances + act/evidence/verify receipts → Archive |
| P3 | Illegal skip Plan→Evidence → ILLEGAL_STAGE_TRANSITION |
| P4 | Gemini infra → GEMINI_TOOL_FAILED; stage stays Act; no Archive |
| P5 | Soft QA → ARCHIVE_REQUIRES_HITL_SOFT_QA without HITL |
| P6 | Soft QA + hitlReceipt.ok → Archive |
| P7 | Verify fail → assertArchiveAllowed denies Archive |
| P8 | Evidence→Verify without evidence receipt → VERIFY_REQUIRES_EVIDENCE |
| P9 | Infra fail → applyDiff never called |
| P10 | Pure-native compose → dispatcher not required / not invoked |
| P11 | Evidence receipt carries toolOutputs + custody hashes |
| P12 | Optional live SKIP |

## Tool stage gate

`LOOP_COMPUTE_TOOL_STAGES['eos.compute.run'] = ['Act']` lives in the orchestrator (does not silently expand `mission-loop.js`).

## Non-goals

No ATS phase mutation. No Fundacion writes. No new JSON schemas / npm deps.

# Design — Mission S (SPEC-0024)

## Architecture

```
createSpecbootAgentRunner({
  readChange, parseTasks, runOrchestration|dispatchTask,
  writeEvidence, hash, now?, archiveChange?,
  allowArchiveDespiteSoftQa=false,
  bindExecuteComputeRun?, workerDaemon?
})
  loadChange(changeId)
    → proposal + checkbox tasks; refuse empty → SPECBOOT_CHANGE_INVALID
  runPhase(phase, ctx)
    PROPOSE  → validate proposal/tasks
    APPLY    → for each pending task: runOrchestration once; fail-closed SPECBOOT_APPLY_FAILED
               writeEvidence EVD-XXXX.json (sha256, changeId, phase, taskIds, PRODUCTION_READY:NO)
    VERIFY   → require hashed receipts; else SPECBOOT_VERIFY_REQUIRES_EVIDENCE
    ARCHIVE  → archiveChange(meta) only; mergedToMain=false (no git merge main)
    COMMIT_READY → status ready-for-HITL-PR; pushed=false
  runCycle(changeId) → PROPOSE→APPLY→VERIFY→ARCHIVE→COMMIT_READY
  health/status → { kind:'eos-specboot-agent-runner', PRODUCTION_READY:'NO', cloudAgent:false, hitlPublishRequired:true }
```

## Evidence receipt shape

`docs/evidence/EVD-XXXX.json`:
`{ id, changeId, phase, taskIds, sha256|bodySha256, at, orchestration, PRODUCTION_READY:'NO', kind }`

## Controls

| ID | Control |
|----|---------|
| S1 | PRODUCTION_READY=NO + kind |
| S2 | loadChange parses proposal + checkboxes |
| S3 | invalid change → SPECBOOT_CHANGE_INVALID |
| S4 | APPLY dispatches each pending task once |
| S5 | APPLY fail-closed SPECBOOT_APPLY_FAILED |
| S6 | VERIFY without evidence denied |
| S7 | happy path EVD written + COMMIT_READY HITL |
| S8 | ARCHIVE no main-merge side effect |
| S9 | COMMIT_READY no push |
| S10 | health never claims CloudAgent / PR yes |
| S11 | optional bindExecuteComputeRun wire |
| S12 | parseTasks + hash helpers |
| S13 | Optional live soak SKIP |

## Honesty

- ≠ second SpecBoot pipeline replacing AGY skills / `node bin/eos.js`
- ≠ CloudAgent path
- ≠ autonomous main merge
- COMMIT_READY ≠ git push/merge; publish remains HITL
- PRODUCTION_READY remains `'NO'`

## Non-goals

No PRODUCTION_READY flip. No Fundacion writes. No CloudAgent. No P/Q core rewrites. No new npm deps. No TR-01 raise.

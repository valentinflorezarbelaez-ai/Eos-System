# Design — Mission W (SPEC-0028)

## Architecture

```
createSovereignSessionCoordinator({
  workerDaemon?,   // Mission Q: start / stop({drain:true}) / health?
  sentinel?,       // Mission R: start? / tick? / stop? / quarantine?
  specboot?,       // Mission S: run(change) | runCycle | start?
  remediation?,    // Mission V: run(failureContext) | start?
  writeGateway?,   // Mission T: authorize|authorizeExternalWrite / write|runGovernedWrite / rollback?
  maxRemediationAttempts=3 (clamp ≥1),
  hash?, now?, onReceipt?,
  requireWorker=true, requireSpecboot=true
})
  openSession(ctx) / startSession(ctx)
    IDLE → INITIALIZING (boot worker+sentinel) → SESSION_ACTIVE | ESCALATED_HITL
  runChange(openspecChange)
    require SESSION_ACTIVE
    optional sentinel.tick → quarantine escalate
    optional writeGateway authorize/write/rollback
    SpecBoot run; on APPLY/VERIFY fail → remediation (≤3) → RESOLVED keep session | ESCALATED_HITL
  closeSession() / seal()
    CLOSING (worker.stop({drain:true}) + sentinel.stop) → SEALED (EVD sha256 custody) → COMPLETED
    (if was escalated: still seal, end ESCALATED_HITL)
  health/getState/getReceipts/getSealedEvd
```

## State machine

`IDLE → INITIALIZING → SESSION_ACTIVE → CLOSING → SEALED → COMPLETED | ESCALATED_HITL`

Fail-closed: missing critical ports → ESCALATED_HITL (or typed SESSION_INVALID_STATE / SESSION_DEPENDENCY). Never infinite retry. Fundacion never touched.

## Port contracts (injection only — do not rewrite Q/R/S/T/V)

| Port | Expected surface |
|------|------------------|
| workerDaemon | `start()`, `stop({drain:true})`, `health?` |
| sentinel | `start?`, `tick?`, `stop?`, `quarantine?`, `health?` |
| specboot | `run(change)` or `runCycle` or `start` |
| remediation | `run(failureContext)` or `start` |
| writeGateway | `authorize`/`authorizeExternalWrite`, `write`/`runGovernedWrite`, `rollback?` |

## EVD custody seal

Close seals consolidated in-memory EVD with `sha256` / `bodySha256` (64-hex) and `custody: { algorithm:'sha256', digest, receiptCount, changesRun, remediationsInvoked }` — sealEvd / SpecBoot hashing style. Hermetic: no real Fundacion paths.

## Controls

| ID | Control |
|----|---------|
| W1 | Happy path open→run→seal→COMPLETED |
| W2 | INITIALIZING boots worker+sentinel |
| W3 | APPLY fail then remediation resolves |
| W4 | Remediation exhaust → ESCALATED_HITL |
| W5 | CLOSING drains worker with drain:true |
| W6 | SEALED emits EVD sha256 custody receipt |
| W7 | writeGateway deny/rollback path |
| W8 | PRODUCTION_READY NO + kind |
| W9 | Missing ports fail-closed |
| W10 | State machine honesty |
| W11 | Sentinel quarantine during session |
| W12 | startSession alias + clamp |
| W13 | NON-CLAIM source honesty |
| W14 | Close after escalate still seals EVD |

## Honesty

- ≠ agy-daemon / AGY DAEMON_PRESENT
- ≠ rewriting Q/R/S/T/V (consumes via injection)
- PRODUCTION_READY remains `'NO'`
- Fundacion Δ=0

## Non-goals

No PRODUCTION_READY flip. No Fundacion writes. No CloudAgent. No TR-01 raise. No infinite retry.

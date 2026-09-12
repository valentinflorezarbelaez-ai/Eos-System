# Design — Mission V (SPEC-0027)

## Architecture

```
createFdirRemediationLoop({
  maxAttempts=3 (clamp ≥1),
  diagnose, remediate, verify,   // REQUIRED ports
  sentinel?,                     // optional Mission R–style gate
  hash?, now?, onReceipt?
})
  default state IDLE
  run(failureContext) / start(failureContext)
    requirePorts() → REMEDIATION_DEPENDENCY if missing
    RUNNING
    while attempts < maxAttempts:
      attempts++
      DIAGNOSING  → diagnose(ctx)
      REMEDIATING → remediate(ctx, diagnosis)
        if sentinel.checkRemediation denies → quarantine + fail attempt
      REVERIFYING → verify(ctx, remediation)
        if ok → RESOLVED + seal receipt + return
        else seal FAILED receipt + continue
    ESCALATED_HITL (fail-closed return; no uncontrolled throw)
  health/status → { state, kind, PRODUCTION_READY:'NO', attempts, maxAttempts, ... }
  getReceipts() → sealed audit receipts with sha256 / bodySha256
```

## State machine

`IDLE → RUNNING → DIAGNOSING → REMEDIATING → REVERIFYING → RESOLVED | ESCALATED_HITL`

On port throw during an attempt: seal FAILED receipt for that phase, consume attempt, continue or escalate.

## Sentinel integration (optional)

If `sentinel.checkRemediation(plan, ctx)` returns deny / quarantine / unauthorized / orphans:
call `sentinel.quarantine(pathKey, reason)` when present, seal
`REMEDIATION_SENTINEL_QUARANTINE` receipt, fail that attempt (do not verify).

## Receipt sealing (sealEvd-compatible)

Each cycle seals an in-memory receipt with `sha256` / `bodySha256` (SHA-256 of
canonical body without hash fields) — same hashing style as SpecBoot EVD /
sealEvd body hashes. Hermetic: no real Fundacion paths; no mandatory disk write.

## Controls

| ID | Control |
|----|---------|
| V1 | Nominal resolve attempt 1 |
| V2 | Recover on attempt 2 |
| V3 | Exhaust budget → ESCALATED_HITL |
| V4 | Sentinel quarantine path |
| V5 | maxAttempts clamp ≥1 |
| V6 | diagnose/remediate/verify port wiring |
| V7 | Audit receipt SHA-256 present |
| V8 | PRODUCTION_READY NO |
| V9 | kind check |
| V10 | Missing ports fail-closed |
| V11 | State transitions honest |
| V12 | Diagnose throw → escalate |
| V13 | NON-CLAIM source honesty |

## Honesty

- ≠ agy-daemon / AGY DAEMON_PRESENT
- ≠ eos-compute-worker-runtime
- ≠ rewriting Mission R `fdir-sentinel-runtime` (consumes optionally)
- PRODUCTION_READY remains `'NO'`
- Fundacion Δ=0

## Non-goals

No PRODUCTION_READY flip. No Fundacion writes. No CloudAgent. No TR-01 raise. No infinite retry.

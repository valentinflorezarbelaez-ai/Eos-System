# Design — Mission AI (SPEC-0040)

## Architecture

```
createMultiSessionAutonomyCoordinator({
  store?,              // { load/save/list } — default in-memory
  custodyStore?,       // hash-chained snapshots (optional thin helper)
  loop?,               // optional AF { runCycle(intent) }
  hitl?,               // { approve } — default DENY
  requireHitl?=false,
  resumeActiveIdempotent?=false,  // documented: default fail-closed
  hash?, now?, onReceipt?, throwOnDeny?
})
  createSession(meta?)
  suspendSession(id)   // ACTIVE → SUSPENDED; seal snapshot+hash+generation
  resumeSession(id)    // verify hash/generation/custody → ACTIVE or SESSION_DRIFT
  getSession(id) / listSessions()
  runCycle(sessionId, intent)  // optional AF inject; ACTIVE only
  health() / getState() / getReceipts()
    kind:'eos-multi-session-autonomy-coordinator', PRODUCTION_READY:'NO'
```

## Fail-closed codes

| Condition | Code |
|-----------|------|
| unknown id | `UNKNOWN_SESSION` |
| snapshot hash/generation mismatch | `SESSION_DRIFT` |
| suspend twice / resume ACTIVE (default) | `INVALID_STATE` |
| HITL denied | `HITL_REQUIRED` |
| AF loop missing for runCycle | `MISSING_DEP` |
| Fundacion write intent | `FUNDACION_DENY` |

## Drift model

- On suspend: freeze serializable snapshot; compute `snapshotHash` over
  canonical fields; append custody chain tip; bump `generation`.
- On resume: recompute hash; compare to sealed `snapshotHash` + generation +
  custody digest; mismatch → DENY `SESSION_DRIFT` (no silent drift).
- Resume restores prior custody tip into the new chain entry
  (`restoredCustodyDigest` / `restoredSnapshotHash`).

## Law VI

- Deep redact api_key / token / authorization / secret / password
- Vendor-style key substrings via runtime-built regex (never static
  vendor-key literals — AF11 lesson)
- Receipts / getState never echo secrets

## Controls

| ID | Control |
|----|---------|
| AI1 | kind + PRODUCTION_READY NO |
| AI2 | create + list |
| AI3 | suspend/resume no drift |
| AI4 | drift DENY |
| AI5 | unknown session |
| AI6 | suspend twice / resume active fail-closed |
| AI7 | Law VI runtime synth |
| AI8 | custody receipts |

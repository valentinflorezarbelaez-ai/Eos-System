# Design — Mission CH Long-Horizon Mission Archive & Replay Port

## Architecture

```
plan { archiveId, trailEntries[] { missionId, receiptId, digest } }
        │
        ▼
MissionArchiveReplayPolicyGate.evaluateArchivePlan / evaluateReplayPlan
        │ deny → CH-RCPT decision=DENY (trailEntries=[])
        ▼
decision ARCHIVE | REPLAY
        │
        ▼
trailDigest = sha256({archiveId, trailEntries, decision, …})
        │
        ▼
CH-RCPT-* nine-field seal + store by archiveId (in-memory only)
```

## Nine-field seal

`receiptId, operation, archiveId, decision, entryCount, trailDigest, timestamp, fundacionDelta, prevReceiptHash`

Plus frozen on receipt: `trailEntries[]`, `reasons[]`, optional `replayCursor`.

## Gate rules (fail-closed)

- Require non-empty valid `archiveId` (not Fundacion path)
- Require trailEntries length 1..`CH_MAX_ENTRIES` (default 64) for archive
- missionId / receiptId match patterns; digests are 64 lowercase hex
- Reject Fundacion targets in plan or entries / Law VI secrets
- Reject empty trail
- Replay may resolve sealed in-memory archive by archiveId alone

## Isolation doctrine

Pure `node:crypto`. Hermetic in-memory trail only. No disk lake. No SIEM. Does not touch Fundacion trees.

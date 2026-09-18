# Design — Mission CE Sovereign Operator Reality Console Port

## Architecture

```
plan { consoleId, snapshotAt?, entries[{ladder, satellite?, status, evidenceRef?}] }
        │
        ▼
OperatorRealityConsolePolicyGate.evaluatePlan
        │ deny → CE-RCPT decision=DENY (entries=[], summary zeros)
        ▼
decision VIEW
        │
        ▼
summary = aggregate MEASURED|UNKNOWN|BLOCKED counts
rootDigest = sha256({consoleId, snapshotAt, entries, summary, decision})
        │
        ▼
CE-RCPT-* nine-field seal + store by consoleId
```

## Nine-field seal

`receiptId, operation, consoleId, decision, snapshotAt, entryCount, timestamp, fundacionDelta, prevReceiptHash`

Plus frozen on receipt: `entries[]`, `summary{measured,unknown,blocked,total}`, `reasons[]`.

## Gate rules (fail-closed)

- Require non-empty `consoleId` (not Fundacion path)
- Require entries length 1..`CE_MAX_ENTRIES` (default 64)
- Ladder ids match L11–L24 known set
- Status enum only: MEASURED | UNKNOWN | BLOCKED
- Reject Fundacion targets / Law VI secrets
- Reject empty console

## Isolation doctrine

Pure `node:crypto`. No network. No SIEM/APM APIs. Does not touch Fundacion trees.

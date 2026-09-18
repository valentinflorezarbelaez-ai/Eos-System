# Design — Mission CB Cross-Ladder Composition Orchestrator Port

## Architecture

```
plan { compositionId?, stages[{id,ladder,satellite,inputDigest?}] }
        │
        ▼
CrossLadderCompositionPolicyGate.evaluatePlan
        │ deny → CB-RCPT status=DENIED
        ▼
hermetic stage loop → STAGE-SEAL-<SAT>-<sha16> (chained digests)
        │
        ▼
rootDigest = sha256({compositionId, stageSeals[]})
        │
        ▼
CB-RCPT-* nine-field seal + store by compositionId
```

## Nine-field seal

`receiptId, operation, compositionId, rootDigest, status, stageCount, timestamp, fundacionDelta, prevReceiptHash`

## Allowed satellites

- L22: BR, BS, BT, BU, BV
- L23: BW, BX, BY, BZ

## Isolation doctrine

Do not import/call full BR–BZ ports. Stub seals keep CB hermetic and free of heavy deps.

## AS lineage

`composition-receipt.js` (AS-RCPT-*) remains untouched. CB uses new filenames only.

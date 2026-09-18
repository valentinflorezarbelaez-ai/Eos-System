# Design — Mission BZ Merkle Ledger Notarization (SPEC-0083)

## Architecture

Three Layer-0 modules under `src/core/audit/`, mirrored from Mission BY SDD ports:

1. **Receipt** — nine-field canonical seal hashed with SHA-256 (`node:crypto`).
2. **Policy gate** — fail-closed `evaluateBatch(leaves, context)`.
3. **Port** — builds tree, stores notarizations, seals receipts, proves inclusion.

## Merkle construction

```
leaves[0..n-1]  → level 0
while level.length > 1:
  for i in 0,2,4,...:
    if pair exists: H(left||right)
    else:           H(last||last)   # Bitcoin-style duplicate-last
```

Inclusion proof: sibling hashes + `left`/`right` directions; verify by recomputing path to root.

## Receipt schema (nine fields)

`receiptId`, `operation`, `notarizationId`, `rootHash`, `status`, `leafCount`, `timestamp`, `fundacionDelta` (always 0), `prevReceiptHash`.

## Fail-closed denials

`EMPTY_BATCH_DENY`, `OVERSIZED_BATCH_DENY`, `MALFORMED_LEAF_DENY`, `SECRET_DETECTED_DENY`, `FUNDACION_ALWAYS_DENY`.

## NON-CLAIMS

Merkle ledger ≠ public blockchain / ≠ cryptocurrency / ≠ PRODUCTION_READY=YES.

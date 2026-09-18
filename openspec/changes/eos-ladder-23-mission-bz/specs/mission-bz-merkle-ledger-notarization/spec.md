# Spec — Mission BZ Continuous Cryptographic Ledger Merkle Notarization (SPEC-0083)

## Purpose

Provide O(log N) Merkle inclusion proofs over ordered leaf digests with sealed `BZ-RCPT-*` custody, fail-closed policy, and pure `node:crypto` Layer-0 purity.

## Requirements

### Receipt

- WHEN a notarization succeeds or is denied, THE SYSTEM SHALL emit a sealed `BZ-RCPT-*` receipt with nine canonical fields and SHA-256 `receiptHash`.
- THE SYSTEM SHALL set `productionReady` to `NO` and `fundacionDelta` to `0` on every receipt.
- IF receipt fields are tampered after sealing, THEN THE SYSTEM SHALL fail `verifyMerkleLedgerReceipt`.

### Policy gate

- WHEN a leaf batch is empty, THE SYSTEM SHALL reject with `EMPTY_BATCH_DENY`.
- WHEN a batch exceeds the max size bound, THE SYSTEM SHALL reject with `OVERSIZED_BATCH_DENY`.
- WHEN a leaf lacks digest/payload, THE SYSTEM SHALL reject with `MALFORMED_LEAF_DENY`.
- WHEN Law VI secret patterns appear in leaf payloads, THE SYSTEM SHALL reject with `SECRET_DETECTED_DENY`.
- WHEN a Fundacion path is targeted, THE SYSTEM SHALL reject with `FUNDACION_ALWAYS_DENY`.

### Port

- WHEN ordered leaves pass the gate, THE SYSTEM SHALL build a binary SHA-256 Merkle tree using Bitcoin-style odd-node duplication and emit root + sealed receipt.
- THE SYSTEM SHALL provide `proveInclusion(notarizationId, leafIndex)` returning sibling hashes and directions.
- THE SYSTEM SHALL provide `verifyInclusion(leafDigest, proof, root)` returning boolean in O(log N) work relative to tree depth.
- THE SYSTEM SHALL provide `verifyTrail()` validating hash-chained receipt custody.
- THE SYSTEM SHALL store and retrieve notarizations by id.

## NON-CLAIMS

- Merkle ledger ≠ public blockchain
- Merkle ledger ≠ cryptocurrency
- PRODUCTION_READY=NO

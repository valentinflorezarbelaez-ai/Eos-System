# Release Notes — EOS Mission BZ Continuous Cryptographic Ledger Merkle Notarization Port

- **Date:** 2026-09-18
- **Spec:** SPEC-0083
- **Ladder:** 23 (OPEN — Audit + BW+BX+BY MEASURED · BZ code-ready · CA pending)
- **PRODUCTION_READY:** NO
- **Fundacion Δ:** 0

## Summary

Adds Layer-0 Merkle-tree continuous notarization under `src/core/audit/` so long receipt chains gain O(log N) inclusion proofs instead of O(N) sequential traversal. Emits sealed `BZ-RCPT-*` receipts with hash-chained custody.

## Deliverables

- `merkle-ledger-receipt.js` / `merkle-ledger-policy-gate.js` / `merkle-ledger-notarization-port.js`
- Hermetic tests (20/20 pass under `node --test`)
- ADR-0044, OpenSpec change, evidence EVD
- Wiring: `test:mission-bz`, `test:merkle-ledger`, SLIM exclude

## Merkle strategy

Binary SHA-256 Merkle tree; **Bitcoin-style duplicate-last** when a level has an odd node count.

## NON-CLAIMS

- Merkle ledger ≠ public blockchain
- Merkle ledger ≠ cryptocurrency
- Does not flip PRODUCTION_READY
- Does not write Fundacion paths
- Does not reopen L17–L22

## Apply (Windows)

See `APPLY-MISSION-BZ.txt`. Box-only packaging; no git push from box.

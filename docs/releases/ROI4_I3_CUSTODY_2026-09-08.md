# ROI4 I3 Evidence Custody 2026-09-08

Branch: cursor/roi4-i3-custody
Base main tip: a7dd7ba93ae393ec72f7f95c19710d8aadd653f9
Scope: ROI4 ONLY (no ROI5+)
PRODUCTION_READY: NO

## Goal

Strengthen cryptographic/evidence custody so mission/verify receipts form a tamper-evident chain (I3), without inventing a parallel ledger.

## Real gap (evidence)

- HashChainedLedger (ADR-0009): canonical mission ledger not wired to EVD/mission-loop/verify custody stream
- ContractEvidenceSealer: island SHA-256 seals without previous_hash chain
- Mission-loop receipts[]: mutable JSON, not fail-closed hash-chained
- verify:strict: no custody integrity check
- Independent verifier I2: orthogonal isolation fingerprint

## Design

- Facade EvidenceCustody over HashChainedLedger
- No parallel ledger
- Seams EVD_SEALED MISSION_LOOP_ADVANCE RECEIPT VERIFY_RECEIPT
- Fail-closed DENY on broken chain

## Deliverables

- evidence-custody.js
- custody-verify.js
- verify:strict light check
- roi4-i3 tests
- ADR-0015

## Verify

npm run test:roi4
npm run custody:verify
npm run verify:strict

## Freeze follow-through

- No ROI5+
- No merge this change set
- PRODUCTION_READY remains NO
- Delta=0 external target
- DEFER dirty unstaged

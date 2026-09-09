# ADR-0015: Evidence Custody Binding to Canonical HashChainedLedger (ROI4 I3)

**Status:** ACCEPTED
**Date:** 2026-09-08
**Extends:** ADR-0009
**Related:** ADR-0014, ContractEvidenceSealer, I2 verifier

## Decision

1. EvidenceCustody is a thin facade over HashChainedLedger (CP-EVIDENCE).
2. No second hash-chain implementation.
3. Seal EVD writes, mission-loop advances/receipts, verify receipts.
4. Fail-closed DENY on broken previous hash.
5. External target paths denied as custody storage.

## Consequences

Tamper-evident custody without parallel ledger. Empty genesis PASS for fresh clones. ROI5+ external notarization out of scope.

## Amendment (G7 - 2026-09-08)

Canonical docs/evidence EVD writes MUST go through sealEvd SSOT (src/core/sdd/evd-seal-path.js), which always advances EvidenceCustody on non-dryRun. Bypass writers are fail-closed (runtime DENY + static audit). Mission-local evidence dirs remain on mission ledgers.

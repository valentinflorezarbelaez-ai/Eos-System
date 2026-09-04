# EOS Legacy Compatibility & Deprecation Policy

**Document ID:** POL-LEGACY-001  
**Status:** CANONICAL_GOVERNANCE_POLICY  
**Date:** 2026-08-20  
**Authority:** Human Director & EOS Senior Systems Architect  

---

## 1. Purpose and Philosophy

Purification in EOS does not mean reckless cosmetic deletion of historic code. It means establishing **unambiguous Single Sources of Truth (SSOT)**, mapping all dependency consumers, and preserving legacy stubs and adapters when they serve verified regression prevention functions.

---

## 2. Taxonomy of Legacy Artifacts

Every non-canonical artifact in EOS must be classified into one of the following four lifecycle tiers:

1. **`ACTIVE_SUPPORTING`**: Supporting utilities and adapters actively imported by the canonical control plane (e.g. `scripts/engine/context-compiler.js`, `scripts/engine/authority-adapter.js`).
2. **`LEGACY_COMPATIBILITY`**: Forwarder stubs maintained solely to prevent import breakage across historical regression test suites (e.g. `scripts/engine/hitl-gatekeeper.js` $\to$ `src/core/sdd/hitl-gatekeeper.js`).
3. **`SUPERSEDED`**: Replaced legacy implementations that must never be used for new development (e.g. `scripts/engine/mission-ledger.js` superseded by `HashChainedLedger` under `ADR-0009`).
4. **`QUARANTINE_CANDIDATE`**: Dead or unreferenced artifacts staged for review before isolated archiving.

---

## 3. Strict Rules for Modifying or Retiring Stubs

1. **Zero Breaking Changes**: No forwarder stub in `scripts/engine/` may be removed or modified unless an automated AST reference audit proves zero active consumers across all test suites, fixtures, and audit harnesses.
2. **One-Way Canonical Migration**: All new core engines, services, and tests MUST import directly from canonical locations in `src/core/`. Importing from `scripts/engine/` stubs in new features is strictly prohibited.
3. **Alias Preservation**: Where historical documents share identifiers (e.g., `ADR-0002`), physical files must be preserved and indexed via the Canonical Alias Table (`ADR-0002-CONTROL-PLANE` and `ADR-0002-LUXE`) to protect registry checksums and workspace integrity verifiers.

---

## 4. Preconditions for Future Component Registration

Any future component introduced into EOS must strictly satisfy the 5-Point Epistemic Standard:
1. **Assigned Canonical Domain**: Must belong to an established architectural domain (or define an approved new domain).
2. **Validated JSON Schema**: Must have a Draft 2020-12 schema registered in `scripts/validate_schemas.js`.
3. **Deterministic Automated Tests**: Must have full test coverage passing in `node --test`.
4. **Cryptographic Evidence Link**: Must bind outputs to SHA-256 evidence receipts recorded in `HashChainedLedger`.
5. **Declared Epistemic Provenance**: Must explicitly classify metrics and claims (`PROVEN_CAPABILITY`, `DISCOVERED_COMPATIBILITY`, `DECLARED_SUPPORT`, `SIMULATED_ONLY`, or `BLOCKED`).

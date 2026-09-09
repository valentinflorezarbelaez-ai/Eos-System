# Deferred Writers Governance (R5 delta)

Capability: fail-closed honesty lock for post-Q5 deferred / non-selected writers (Choice B — NON-CLAIM inventory + verify lock).

## Requirements

### Requirement: Decision B documented

R5 SHALL document Choice B (do not fake-route HashChainedLedger / ledger-recovery through mission-artifact Write Barrier envelope) with investigation rationale.

#### Scenario: Design records Choice B

- GIVEN `openspec/changes/eos-r5-deferred-writers-governance/design.md`
- WHEN operators read the Decision section
- THEN it states **B** and cites SSOT missing `.eos`, `.missions`-only envelope, and ADR-0015 no parallel ledger

### Requirement: Ranked inventory with NON-CLAIM sections

Inventory doc MUST exist with ranked deferred writers and explicit NON-CLAIM language that deferred writers remain internal by design.

#### Scenario: Required sections present on real tree

- GIVEN `docs/releases/EOS_R5_DEFERRED_WRITERS_INVENTORY_2026-09-09.md`
- WHEN `auditDeferredWritersLock` runs
- THEN `ok` is true and required section needles are present

### Requirement: Fail-closed when NON-CLAIM stripped

#### Scenario: Stripped inventory denies

- GIVEN inventory text with required NON-CLAIM / section needles removed
- WHEN the audit runs with `docText` override
- THEN `ok` is false

### Requirement: Fail-closed when inventory missing

#### Scenario: Missing doc denies

- GIVEN `docMissing: true`
- WHEN the audit runs
- THEN `ok` is false

### Requirement: No parallel EVD ledger / no fake route

#### Scenario: Inventory NON-CLAIM forbids parallel EVD and fake route

- GIVEN the inventory + R5 evidence docs
- WHEN operators read NON-CLAIM sections
- THEN they state no parallel EVD ledger, Choice B != fake Write Barrier route, PRODUCTION_READY=NO, Fundacion Delta=0, App Fuerza untouched

### Requirement: verify:strict wires the lock

#### Scenario: verify-eos imports deferred-writers-lock

- GIVEN `scripts/verify-eos.js`
- WHEN inspected
- THEN it imports `auditDeferredWritersLock` and includes lock paths in REQUIRED_PATHS

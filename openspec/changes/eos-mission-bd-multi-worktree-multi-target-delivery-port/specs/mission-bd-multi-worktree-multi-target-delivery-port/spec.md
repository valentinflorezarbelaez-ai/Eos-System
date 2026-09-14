# Spec — mission-bd-multi-worktree-multi-target-delivery-port (SPEC-0061)

## ADDED Requirements

### Requirement: Governed hermetic multi-target delivery

The system SHALL expose `createMultiWorktreeMultiTargetDeliveryPort` and
`deliver` that place a sealed artifact onto one or more in-memory / virtual
worktree roots under an allowlist, with phases VALIDATE → GATE → DELIVER →
SEAL, and SHALL NOT invoke real `git worktree` or remote CD.

#### Scenario: Happy-path multi-target deliver

- GIVEN allowlisted targets and a well-formed sealed artifact
- WHEN `deliver` is invoked
- THEN the result is `ok: true`, `code: DELIVERED`, and a sealed receipt with
  sha256 `receiptDigest` is returned

### Requirement: Fail-closed DENY

The system SHALL DENY (sealed receipt) for Fundacion path writes, targets
outside the allowlist, BA isolation policy violations (via injectable ports),
missing/invalid BC apply seal when required, malformed artifact, empty /
invalid requests, and disallowed network/cloud fleet claim paths. A
multi-target request with any single failing target SHALL DENY the whole
request (no partial success claim).

#### Scenario: Fundacion DENY

- GIVEN a request targeting a Fundacion path or `fundacion: true`
- WHEN `deliver` is invoked
- THEN `code` is `FUNDACION_DENY` and `fundacionDelta` is `0`

### Requirement: Injectable AN/BA/BC observe ports

The system SHALL accept optional injectable `ports.anFederation` /
`ports.federationObserve`, `ports.baIsolation` / `ports.axEngine`, and
`ports.bcApply` / `ports.applySeal`, and SHALL NOT rewrite AN/AX/BA/BC source
modules into this payload.

### Requirement: NON-CLAIM and readiness

The system SHALL set `PRODUCTION_READY` to `NO` and SHALL NOT claim
multi-tenant cloud fleet, Kubernetes CD, PRODUCTION_READY delivery product, or
BE/BF/BG scope. L17 and L18 SHALL remain CLOSED (never reopen); L19 OPEN
(BC MEASURED; BD in progress; BE–BG pending).

### Requirement: Law VI MODULE_DIR scan

Law VI audits SHALL scan only `src/core/delivery` (MODULE_DIR) and SHALL NOT
embed contiguous forbidden provider key prefixes as static literals in MODULE_DIR.

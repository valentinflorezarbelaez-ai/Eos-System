# Spec — mission-bc-governed-patch-diff-apply-port (SPEC-0060)

## ADDED Requirements

### Requirement: Governed hermetic patch apply

The system SHALL expose `createGovernedPatchDiffApplyPort` and `applyPatch`
that apply a structured or unified-diff-like patch onto an in-memory / virtual
filesystem under an allowlist, with phases VALIDATE → GATE → APPLY → SEAL, and
SHALL NOT invoke real `git apply` or GitHub APIs.

#### Scenario: Happy-path allowlisted apply

- GIVEN an allowlisted target and a well-formed structured patch
- WHEN `applyPatch` is invoked
- THEN the result is `ok: true`, `code: APPLIED`, and a sealed receipt with
  sha256 `receiptDigest` is returned

### Requirement: Fail-closed DENY

The system SHALL DENY (sealed receipt) for Fundacion path writes, paths outside
the allowlist, Law VI / secret leakage in the patch body, missing/invalid AX
engine seal when required, HITL required but not granted, malformed patch, and
empty / invalid requests.

#### Scenario: Fundacion DENY

- GIVEN a request targeting a Fundacion path or `fundacion: true`
- WHEN `applyPatch` is invoked
- THEN `code` is `FUNDACION_DENY` and `fundacionDelta` is `0`

### Requirement: Injectable AX/AQ observe ports

The system SHALL accept optional injectable `ports.axSeal` / `ports.axEngine`
and `ports.aqObserve` / `ports.aqNotary` and SHALL NOT rewrite AX/AQ source
modules into this payload.

### Requirement: NON-CLAIM and readiness

The system SHALL set `PRODUCTION_READY` to `NO` and SHALL NOT claim unsupervised
auto-merge SaaS, GH Actions replacement, PRODUCTION_READY delivery product, or
BD/BE/BF/BG scope. L17 and L18 SHALL remain CLOSED (never reopen); L19 OPEN.

### Requirement: Law VI MODULE_DIR scan

Law VI audits SHALL scan only `src/core/delivery` (MODULE_DIR) and SHALL NOT
embed contiguous forbidden provider key prefixes as static literals in MODULE_DIR.

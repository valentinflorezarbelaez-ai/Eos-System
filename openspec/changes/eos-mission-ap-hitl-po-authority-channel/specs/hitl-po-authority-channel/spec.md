# Spec — hitl-po-authority-channel (SPEC-0047)

## Purpose

Hermetic HITL / PO Authority Channel Hardening over AI+AK: escalate opens
authority request with sealed receipt linkage to injectable AJ-like ledger;
approve resumes; deny/timeout DENY with forensic receipt (no auto-approve);
open request blocks dependent AF-like cycle advance; Law VI secrets.

## Requirements

### Requirement: Injectable authority channel

THE SYSTEM SHALL provide `createHitlPoAuthorityChannel` with kind
`eos-hitl-po-authority-channel` and `AP_PRODUCTION_READY = 'NO'`.

#### Scenario: Escalate opens + pauses scheduler

- WHEN a long-horizon autonomy action requires HITL/PO authority
- THEN the channel SHALL pause scheduling and open an authority request with
  sealed receipt linkage to an injectable AJ-like ledger tip
- AND return `HITL_REQUIRED`

#### Scenario: Approve → resume + sealed receipt

- WHEN PO/HITL decides approve on an open request
- THEN the channel SHALL resume the scheduler and seal an
  `AUTHORITY_APPROVED` receipt linked to the ledger tip

#### Scenario: Deny → DENY + forensic receipt

- WHEN PO/HITL decides deny
- THEN the channel SHALL DENY the pending action and emit a forensic receipt
  (no auto-approve)

#### Scenario: Timeout → DENY (no auto-approve)

- WHEN an authority request times out
- THEN the channel SHALL DENY with `AUTHORITY_TIMEOUT`, set
  `autoApproved=false`, and MUST NOT auto-approve

#### Scenario: Open request blocks dependent cycles

- WHILE an authority request is open
- THEN `tryAdvanceDependentCycle` SHALL return `SCHEDULER_BLOCKED` and MUST
  NOT advance dependent AF-like cycles

### Requirement: Law VI — no secrets in receipts

THE SYSTEM SHALL never persist secrets into sealed receipts or getState dumps.

#### Scenario: Runtime synth redaction

- WHEN a request carries runtime-synthesized vendor-style secrets
- THEN sealed receipts and getState dumps SHALL NOT contain those secret values

#### Scenario: Explicit persist forbidden

- WHEN a request sets persistSecrets / includeSecretsInReceipt
- THEN the channel SHALL DENY with SECRET_LEAK_FORBIDDEN

### Requirement: Fail-closed codes

THE SYSTEM SHALL expose fail-closed codes:
`HITL_REQUIRED`, `AUTHORITY_DENIED`, `AUTHORITY_TIMEOUT`, `AUTHORITY_OPEN`,
`MISSING_DEP`, `INVALID_REQUEST`, `SECRET_LEAK_FORBIDDEN`, `LEDGER_LINK_FAIL`,
`SCHEDULER_BLOCKED` (plus `AUTHORITY_APPROVED` / `OK`).

### Requirement: NON-CLAIM

THE SYSTEM SHALL document NON-CLAIM that HITL/PO authority channel ≠
GH required-check / branch-protection enforcement ≠ org IAM product ≠
PRODUCTION_READY approval SaaS; not AQ/AR; Fundacion Δ=0; Antigravity-first;
CloudAgent out; AP_PRODUCTION_READY=NO.

### Requirement: Hermetic CI

THE SYSTEM SHALL operate with hermetic fake ledger/scheduler/gate only in CI
(no live network / no CloudAgent import path).

### Requirement: Fundacion Δ=0

THE SYSTEM SHALL ALWAYS DENY Fundacion write targets via the authority channel
and keep fundacionDelta=0.

# Spec — evidence-export-notarization-observer (SPEC-0048)

## Purpose

Hermetic Evidence Export & Notarization Observer over AJ (+ optional AL):
export sealed EVD packs with manifest hashes linked to AJ chain tip;
verifyPack forensic FAIL on tamper (no silent accept); optional notary stub
observe receipts WITHOUT claiming legal compliance certification.

## Requirements

### Requirement: Injectable export observer

THE SYSTEM SHALL provide `createEvidenceExportNotarizationObserver` with kind
`eos-evidence-export-notarization-observer` and `AQ_PRODUCTION_READY = 'NO'`.

#### Scenario: Export sealed pack linked to chain tip

- WHEN an operator requests evidence export for a ledger range
- THEN the system SHALL emit a sealed pack with manifest hashes linked to the
  AJ chain tip (injectable ledger fake)
- AND return `EXPORT_OK`

#### Scenario: Verify OK on intact pack

- WHEN verifyPack is called on a good sealed pack
- THEN the system SHALL return `OK` with `verified=true` and
  `silentAccept=false`

#### Scenario: Verify FAIL on tamper (forensic)

- IF pack verification fails on re-check (tamper / missing hash)
- THEN the system SHALL report forensic failure (`TAMPER_DETECTED` or
  `VERIFY_FAIL`) and MUST NOT silently accept

#### Scenario: Notary observe-only when enabled

- WHILE notarization observe mode is enabled
- THEN the system SHALL record notary stub receipts with
  `NOTARY_OBSERVE_ONLY` without claiming legal compliance certification

#### Scenario: Notary mode OFF

- WHEN notarization observe mode is OFF
- THEN the system SHALL NOT claim compliance / legal notary status

### Requirement: Law VI — no secrets in packs

THE SYSTEM SHALL never persist secrets into sealed packs, notary receipts, or
getState dumps.

#### Scenario: Runtime synth redaction

- WHEN entries or requests carry runtime-synthesized vendor-style secrets
- THEN sealed packs and getState dumps SHALL NOT contain those secret values

#### Scenario: Explicit persist forbidden

- WHEN a request sets persistSecrets / includeSecretsInPack
- THEN the observer SHALL DENY with SECRET_LEAK_FORBIDDEN

### Requirement: Fail-closed codes

THE SYSTEM SHALL expose fail-closed codes:
`OK`, `EXPORT_OK`, `VERIFY_FAIL`, `TAMPER_DETECTED`, `MISSING_DEP`,
`INVALID_REQUEST`, `SECRET_LEAK_FORBIDDEN`, `LEDGER_RANGE_EMPTY`,
`NOTARY_OBSERVE_ONLY`, `PACK_SEAL_FAIL`.

### Requirement: NON-CLAIM

THE SYSTEM SHALL document NON-CLAIM that evidence export / notarization
observer ≠ compliance certification product ≠ external audit platform ≠
legal notarization service; not AR; Fundacion Δ=0; Antigravity-first;
CloudAgent out; AQ_PRODUCTION_READY=NO.

### Requirement: Hermetic CI

THE SYSTEM SHALL operate with hermetic fake ledger/timeline/notary only in CI
(no live network / no CloudAgent import path).

### Requirement: Fundacion Δ=0

THE SYSTEM SHALL ALWAYS DENY Fundacion write targets and keep fundacionDelta=0.

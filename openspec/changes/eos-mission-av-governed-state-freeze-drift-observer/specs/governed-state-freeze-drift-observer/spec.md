# Spec — Governed State Freeze & Drift Observer (SPEC-0053)

## ADDED Requirements

### Requirement: Report freeze-drift MEASURED with sealed evidence
WHEN freeze/matrix tip pins disagree with the observed HEAD / origin/main tip, THE SYSTEM SHALL report freeze-drift MEASURED with sealed evidence.

#### Scenario: freeze ≠ observed → DRIFT_MEASURED
- GIVEN hermetic freezeTip and observedTip that differ (40-hex SHAs)
- WHEN `observe({ mode: 'observe' })` is invoked
- THEN the system returns drift=true with code `TIP_MISMATCH` or `DRIFT_MEASURED` and a sealed receipt containing both tips and mismatches

#### Scenario: freeze ≠ matrix → FREEZE_MATRIX_MISMATCH
- GIVEN hermetic freezeTip and matrixTip that differ
- WHEN `observe` is invoked
- THEN the system returns drift=true with code `FREEZE_MATRIX_MISMATCH` and sealed receipt

#### Scenario: all tips match → MATCHED
- GIVEN freezeTip == matrixTip == observedTip
- WHEN `observe` is invoked
- THEN the system returns `MATCHED` with sealed receipt and honestyClaimAllowed=true

### Requirement: Fail-closed local DENY of honesty claims
IF drift observer is configured fail-closed locally, THE SYSTEM SHALL DENY release honesty claims until tip SSOT is refreshed (no silent accept).

#### Scenario: fail-closed + drift → HONESTY_CLAIM_DENIED
- GIVEN mode=`fail-closed` and freezeTip ≠ observedTip
- WHEN `observe` is invoked
- THEN the system returns `HONESTY_CLAIM_DENIED` with deny=true, honestyClaimAllowed=false, and sealed receipt status DENY

#### Scenario: observe mode + drift → report only
- GIVEN mode=`observe` and tip mismatch
- WHEN `observe` is invoked
- THEN the system reports DRIFT_MEASURED without deny and without throwing as a mutation side-effect

### Requirement: No auto-merge / GH enforcement / billing claims
WHILE observing drift, THE SYSTEM SHALL not auto-merge, not mutate GH branch protection, and not claim GH billing/enforcement upgrades.

#### Scenario: surface NON-CLAIM
- GIVEN the observer surface / sealed receipt
- WHEN inspected for auto-merge / GH branch-protection mutation / required-check enforcement / billing APIs
- THEN all such capabilities are absent or explicitly false (NON-CLAIM)

### Requirement: Production honesty + Fundacion Δ=0
THE SYSTEM SHALL set `AV_PRODUCTION_READY='NO'` and MUST NOT write Fundacion paths (Δ=0 ALWAYS DENY).

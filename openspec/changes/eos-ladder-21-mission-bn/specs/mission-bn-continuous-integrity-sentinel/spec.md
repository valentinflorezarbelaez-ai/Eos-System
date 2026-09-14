# Spec — Mission BN Continuous Integrity Sentinel & FDIR Heartbeat Daemon (SPEC-0071)

## NON-CLAIM

Continuous integrity sentinel ≠ Datadog/Prometheus/K8s daemonset · ≠ heavy APM ·
≠ PRODUCTION_READY=YES monitoring product.
L17–L20 CLOSED never reopen; L21 OPEN (BM MEASURED; BN in progress; BO–BQ pending).
Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric.
Fundacion Δ=0; Antigravity-first.
Do NOT rewrite `src/core/freeze-drift` / `fdir` / `governance`.

## Requirements (EARS)

### REQ-BN-01 Happy-path pulse

WHEN the daemon performs `pulseCheck` with a coherent targetManifestHash AND
no drift/degraded/quarantine signals, THE SYSTEM SHALL seal a `BN-RCPT-*`
receipt with `integrityStatus=OK`.

### REQ-BN-02 Drift DENY

IF drift is signaled (request flag, anomaly, or injectable freezeDrift /
contractDrift / fdir port), THE SYSTEM SHALL fail-closed DENY with
`DRIFT_DETECTED` and emit a sealed diagnostic `BN-RCPT-*` receipt.

### REQ-BN-03 Degraded DENY

IF integrity is degraded, THE SYSTEM SHALL fail-closed DENY with `DEGRADED`
and seal a diagnostic receipt.

### REQ-BN-04 Quarantine isolateDrift

WHEN `isolateDrift` is invoked, THE SYSTEM SHALL quarantine the target,
seal a `QUARANTINED` receipt, stop any running heartbeat timer, and DENY
subsequent pulses with `QUARANTINED`.

### REQ-BN-05 Heartbeat scheduler honesty

WHEN `startHeartbeat` runs with intervalMs>0, THE SYSTEM SHALL schedule
deterministic pulses with an unref'd timer; WHEN `stopHeartbeat` is called
(or quarantine applies), THE SYSTEM SHALL clear the timer so no hanging
pulses remain.

### REQ-BN-06 Receipt trail

WHEN a sequence of sealed BN receipts is presented, THE SYSTEM SHALL verify
each receipt hash and the `prevReceiptHash` chain; IF any break or tamper is
detected, THE SYSTEM SHALL report `TRAIL_BREAK`.

### REQ-BN-07 Fundacion ALWAYS_DENY

WHEN pulse/isolate targets Fundacion (or `fundacion=true`), THE SYSTEM
SHALL immediately DENY with `FUNDACION_ALWAYS_DENY` and `fundacionDelta=0`.

### REQ-BN-08 NON-CLAIM monitoring product

WHILE the continuous integrity sentinel is active, THE SYSTEM SHALL not claim
Datadog/Prometheus/K8s daemonset completeness, heavy APM coverage, or
PRODUCTION_READY=YES.

## Scenarios (Gherkin / BDD)

```gherkin
Feature: Continuous Integrity Sentinel & FDIR Heartbeat (SPEC-0071)

  Scenario: Happy path pulse seals BN-RCPT-*
    Given a hermetic continuous integrity sentinel daemon
    When pulseCheck is invoked with a targetManifestHash
    Then a sealed BN-RCPT-* receipt is returned with integrityStatus OK
    And PRODUCTION_READY remains NO

  Scenario: Drift detected
    Given a running sentinel
    When pulseCheck is invoked with drift=true
    Then the result is DENY with DRIFT_DETECTED
    And a sealed DENY receipt is produced

  Scenario: Quarantine via isolateDrift
    Given a sentinel with prior integrity concern
    When isolateDrift is invoked
    Then the target is quarantined
    And subsequent pulseCheck returns QUARANTINED

  Scenario: Start/stop no timer leak
    Given startHeartbeat with intervalMs=50
    When stopHeartbeat is invoked
    Then no further scheduled pulses occur

  Scenario: Receipt chain
    Given two successive successful pulses
    When verifyReceiptTrail is invoked
    Then the trail is TRAIL_OK
    And the second receipt.prevReceiptHash equals the first receiptHash

  Scenario: Fundacion deny
    Given any pulse or isolate targeting Fundacion
    Then the result is FUNDACION_ALWAYS_DENY with fundacionDelta=0
```

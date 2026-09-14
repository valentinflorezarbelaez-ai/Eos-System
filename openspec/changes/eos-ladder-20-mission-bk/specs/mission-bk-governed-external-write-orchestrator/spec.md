# Spec — Mission BK Governed External Write Orchestrator (SPEC-0068)

## NON-CLAIM

Orchestrator ≠ unsupervised fleet deploy · ≠ K8s/ArgoCD CD · ≠ PRODUCTION_READY=YES.
BH+BI+BJ MEASURED acknowledged; not BL; Fundacion Δ=0; Antigravity-first.
L17/L18/L19 CLOSED never reopen; L20 OPEN (BH+BI+BJ MEASURED; BK in progress; BL pending closeout).
Axis: Sovereign Mission Continuity & Operator Fabric.

## Requirements (EARS)

### REQ-BK-01 Happy-path governed write

WHEN all six preconditions (Registry, Intake, Spec, Audit, Owner Approval,
Level 2 Auth) are present AND the target is allowlisted AND not Fundacion,
THE SYSTEM SHALL execute the governed write via injectable ports and seal
a `BK-RCPT-*` receipt with `status=OK` and `rollbackExecuted=false`.

### REQ-BK-02 Missing precondition DENY

WHEN any required precondition is missing (e.g. Level 2 Auth or Spec),
THE SYSTEM SHALL fail-closed DENY and seal a diagnostic receipt with
`status=DENY` (codes `PRECONDITION_DENY` or `LEVEL2_AUTH_DENY`).

### REQ-BK-03 Fundacion ALWAYS_DENY

WHEN the target project or path is Fundacion (or `writeFundacion=true`),
THE SYSTEM SHALL immediately DENY with `FUNDACION_ALWAYS_DENY` and
`fundacionDelta=0` without invoking apply/delivery side effects.

### REQ-BK-04 Partial failure → automatic rollback

WHEN a port-simulated apply or delivery reports partial/failure,
THE SYSTEM SHALL automatically roll back, set `rollbackExecuted=true`,
and seal a rollback receipt (`status=ROLLBACK`, code `PARTIAL_FAILURE`).

## Scenarios (Gherkin)

```gherkin
Feature: Governed External Write Orchestrator (SPEC-0068)

  Scenario: Happy path all six preconditions
    Given a non-Fundacion allowlisted target project
    And context has registry, intake, spec, audit, ownerApproval, level2Auth
    When executeGovernedWrite is invoked with injectable bcApply/bdDelivery stubs
    Then the write is executed and a sealed BK-RCPT-* receipt is returned
    And PRODUCTION_READY remains NO

  Scenario: Missing Level 2 auth
    Given all preconditions except level2Auth
    When executeGovernedWrite is invoked
    Then the result is DENY with LEVEL2_AUTH_DENY or PRECONDITION_DENY
    And a sealed DENY receipt is produced

  Scenario: Fundacion target
    Given targetProject.id is "fundacion"
    When executeGovernedWrite is invoked
    Then the result is FUNDACION_ALWAYS_DENY with fundacionDelta=0

  Scenario: Partial apply failure triggers rollback
    Given bcApply stub returns ok=false partial=true
    When executeGovernedWrite is invoked with all preconditions
    Then rollbackExecuted is true and a sealed ROLLBACK receipt is produced

  Scenario: Receipt chaining
    Given two successive successful writes
    When the second write omits prevReceiptHash
    Then the second receipt.prevReceiptHash equals the first receiptHash
```

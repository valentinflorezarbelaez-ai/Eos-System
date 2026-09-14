# Spec — Mission BO Multi-Agent Consensus & Two-Key Handoff Gate (SPEC-0072)

## NON-CLAIM

Multi-agent consensus gate ≠ BFT/PoS/blockchain/P2P gossip · ≠ heavy Raft/Blockchain ·
≠ PRODUCTION_READY=YES consensus product · ≠ single-agent auto-approval ·
≠ unsigned async handoff.
L17–L20 CLOSED never reopen; L21 OPEN (BM MEASURED; BN MEASURED; BO in progress; BP–BQ pending).
Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric.
Fundacion Δ=0; Antigravity-first.
Do NOT rewrite `byzantine-consensus-engine.js` / custody / handoff siblings.

## Requirements (EARS)

### REQ-BO-01 Happy-path consensus grant

WHEN the gate evaluates a proposal with distinct builderAgentId and
verifierAgentId AND an APPROVE attestation AND matching evidenceHash,
THE SYSTEM SHALL seal a `BO-RCPT-*` receipt with
`consensusStatus=CONSENSUS_GRANTED`.

### REQ-BO-02 Self-verification DENY

IF builderAgentId equals verifierAgentId (case-insensitive after normalize),
THE SYSTEM SHALL fail-closed DENY with `SELF_VERIFY_DENY` and emit a sealed
diagnostic `BO-RCPT-*` receipt.

### REQ-BO-03 Attestation REJECTED DENY

IF the verifier attestation decision is REJECT/REJECTED, THE SYSTEM SHALL
fail-closed DENY with `ATTESTATION_REJECTED` and seal a diagnostic receipt.

### REQ-BO-04 Missing evidence DENY

IF evidenceHash is missing when required for grant, THE SYSTEM SHALL
fail-closed DENY with `MISSING_EVIDENCE`.

### REQ-BO-05 Evidence mismatch DENY

IF attestation evidenceHash does not match proposal expected evidenceHash,
THE SYSTEM SHALL fail-closed DENY with `EVIDENCE_MISMATCH`.

### REQ-BO-06 Missing verifier DENY

IF verifierAgentId is missing on evaluate, THE SYSTEM SHALL fail-closed
DENY with `MISSING_VERIFIER`.

### REQ-BO-07 Receipt trail

WHEN a sequence of sealed BO receipts is presented, THE SYSTEM SHALL verify
each receipt hash and the `prevReceiptHash` chain; IF any break or tamper is
detected, THE SYSTEM SHALL report `TRAIL_BREAK`.

### REQ-BO-08 Fundacion ALWAYS_DENY

WHEN proposal/attest/evaluate targets Fundacion (or `fundacion=true`),
THE SYSTEM SHALL immediately DENY with `FUNDACION_ALWAYS_DENY` and
`fundacionDelta=0`.

### REQ-BO-09 NON-CLAIM consensus product

WHILE the multi-agent consensus gate is active, THE SYSTEM SHALL not claim
BFT/PoS/blockchain/P2P gossip completeness, heavy Raft/Blockchain coverage,
or PRODUCTION_READY=YES.

## Scenarios (Gherkin / BDD)

```gherkin
Feature: Multi-Agent Consensus & Two-Key Handoff Gate (SPEC-0072)

  Scenario: Happy path grants CONSENSUS_GRANTED BO-RCPT-*
    Given a hermetic multi-agent consensus gate
    When builder submits a proposal and verifier APPROVEs with matching evidence
    And evaluateConsensus is invoked
    Then a sealed BO-RCPT-* receipt is returned with consensusStatus CONSENSUS_GRANTED
    And PRODUCTION_READY remains NO
    And builderAgentId !== verifierAgentId

  Scenario: Self-verification denied
    Given a proposal from agent A
    When attestation or evaluate uses verifierAgentId = A
    Then the result is DENY with SELF_VERIFY_DENY
    And a sealed DENY receipt is produced

  Scenario: Rejected attestation
    Given a proposal with distinct builder and verifier
    When verifier submits decision REJECT
    And evaluateConsensus is invoked
    Then the result is DENY with ATTESTATION_REJECTED

  Scenario: Missing evidence
    Given evaluateConsensus without evidenceHash
    Then the result is DENY with MISSING_EVIDENCE

  Scenario: Evidence mismatch
    Given proposal evidenceHash E1 and attestation evidenceHash E2
    When evaluateConsensus is invoked
    Then the result is DENY with EVIDENCE_MISMATCH

  Scenario: Receipt chain
    Given two successive successful grants
    When verifyReceiptTrail is invoked
    Then the trail is TRAIL_OK
    And the second receipt.prevReceiptHash equals the first receiptHash

  Scenario: Fundacion deny
    Given any proposal/attest/evaluate targeting Fundacion
    Then the result is FUNDACION_ALWAYS_DENY with fundacionDelta=0

  Scenario: Tamper detection
    Given a sealed BO-RCPT-* receipt that has been mutated
    When verifyReceiptTrail or verifyTwoKeyReceipt is invoked
    Then TRAIL_BREAK / tamper mismatch is reported
```

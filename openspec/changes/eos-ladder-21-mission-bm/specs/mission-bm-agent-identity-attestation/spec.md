# Spec — Mission BM Agent Identity Attestation & Action Provenance Port (SPEC-0070)

## NON-CLAIM

Attestation port ≠ OAuth/OIDC/IAM · ≠ SAML IdP · ≠ PRODUCTION_READY=YES identity product.
L17–L20 CLOSED never reopen; L21 OPEN (BM in progress; BN–BQ pending).
Axis: Sovereign Multi-Agent Provenance & Continuous Sentinel Fabric.
Fundacion Δ=0; Antigravity-first. Do NOT rewrite `src/core/consensus`.

## Requirements (EARS)

### REQ-BM-01 Happy-path attestation

WHEN a registered agent presents a valid HMAC session signature AND the
requested toolScope is allowlisted AND prompt/payload hashes bind honestly,
THE SYSTEM SHALL attest the action and seal a `BM-RCPT-*` receipt with
`status=OK`.

### REQ-BM-02 Unregistered / forged / unsigned DENY

IF agent identity is missing (unregistered), attestation is invalid (forged
HMAC), or the action is unsigned, THE SYSTEM SHALL DENY the action and emit
a sealed receipt (`UNREGISTERED_AGENT` / `FORGED_SIGNATURE` / `UNSIGNED_DENY`).

### REQ-BM-03 Prompt / payload / scope / impersonation DENY

IF prompt hash mismatches, action payload hash mismatches, toolScope violates
the agent allowlist, or impersonation is detected, THE SYSTEM SHALL fail-closed
DENY and seal a diagnostic `BM-RCPT-*` receipt.

### REQ-BM-04 Provenance trail

WHEN a sequence of sealed BM receipts is presented, THE SYSTEM SHALL verify
each receipt hash and the `prevReceiptHash` chain; IF any break or tamper is
detected, THE SYSTEM SHALL report `TRAIL_BREAK`.

### REQ-BM-05 Fundacion ALWAYS_DENY

WHEN register/attest targets Fundacion (or `fundacion=true`), THE SYSTEM
SHALL immediately DENY with `FUNDACION_ALWAYS_DENY` and `fundacionDelta=0`.

### REQ-BM-06 NON-CLAIM identity product

WHILE agent identity attestation is active, THE SYSTEM SHALL not claim
OAuth/OIDC/IAM completeness, SAML IdP coverage, or PRODUCTION_READY=YES.

## Scenarios (Gherkin / BDD)

```gherkin
Feature: Agent Identity Attestation & Action Provenance (SPEC-0070)

  Scenario: Happy path registered agent attests action
    Given agent-alpha is registered with an injected HMAC secret
    And a valid session signature for sess-happy
    When attestAction is invoked with allowlisted toolScope
    Then a sealed BM-RCPT-* receipt is returned with status OK
    And PRODUCTION_READY remains NO

  Scenario: Unregistered agent
    Given no registration for ghost-agent
    When attestAction is invoked
    Then the result is DENY with UNREGISTERED_AGENT
    And a sealed DENY receipt is produced

  Scenario: Forged session signature
    Given agent-alpha is registered
    When attestAction is invoked with a forged sessionSignature
    Then the result is DENY with FORGED_SIGNATURE

  Scenario: Prompt tamper
    Given a valid session signature
    When expectedPromptHash does not match the prompt
    Then the result is DENY with PROMPT_MISMATCH

  Scenario: Tool scope violation
    Given agent allowlist is read,observe only
    When attestAction requests toolScope write,shell
    Then the result is DENY with TOOL_SCOPE_DENY

  Scenario: Provenance trail chaining
    Given two successive successful attestations
    When verifyProvenanceTrail is invoked
    Then the trail is TRAIL_OK
    And the second receipt.prevReceiptHash equals the first receiptHash
```

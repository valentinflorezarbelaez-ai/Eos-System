# Spec — provider-failover-resilience-router (SPEC-0046)

## Purpose

Hermetic Provider Failover & Resilience Router over AD+AE: ordered
allowlisted providers, health/deny probes, budget-aware failover under
ECR, fail-closed exhaust with sealed receipt, Law VI secrets.

## Requirements

### Requirement: Injectable ordered failover router

THE SYSTEM SHALL provide `createProviderFailoverResilienceRouter` with
kind `eos-provider-failover-resilience-router` and
`AO_PRODUCTION_READY = 'NO'`.

#### Scenario: Primary success

- WHEN the active (first) provider probe succeeds and invoke completes under ECR
- THEN the router SHALL return COMPLETED with that providerId and a sealed receipt

#### Scenario: Primary fail → secondary under ECR

- WHEN the active provider probe fails OR invoke fails OR ECR denies further spend on the active provider
- AND remaining ECR budget allows
- THEN the router SHALL attempt the next allowlisted provider

#### Scenario: Exhaust → DENY + receipt

- WHEN all allowlisted providers are exhausted OR ECR ceiling is hit
- THEN the router SHALL DENY further LLM calls, seal a receipt, set hitlRequired, and MUST NOT silently unbounded-retry

### Requirement: Law VI — no secrets in receipts

THE SYSTEM SHALL never persist provider secrets into EVD bodies or
federation envelopes / sealed receipts.

#### Scenario: Runtime synth redaction

- WHEN a request carries runtime-synthesized vendor-style secrets
- THEN sealed receipts and getState dumps SHALL NOT contain those secret values

#### Scenario: Explicit persist forbidden

- WHEN a request sets persistSecrets / includeSecretsInReceipt
- THEN the router SHALL DENY with SECRET_LEAK_FORBIDDEN

### Requirement: Fail-closed codes

THE SYSTEM SHALL expose fail-closed codes:
`PROVIDER_PROBE_FAIL`, `ECR_DENY`, `FAILOVER_EXHAUSTED`, `MISSING_DEP`,
`INVALID_REQUEST`, `SECRET_LEAK_FORBIDDEN`, `HITL_REQUIRED`.

### Requirement: NON-CLAIM

THE SYSTEM SHALL document NON-CLAIM that provider failover ≠
PRODUCTION_READY LLM ops ≠ SLA product ≠ multi-cloud billing; not
AP/AQ/AR; Fundacion Δ=0; Antigravity-first; CloudAgent out.

### Requirement: Hermetic CI

THE SYSTEM SHALL operate with hermetic fake providers only in CI
(no live network / no CloudAgent import path).

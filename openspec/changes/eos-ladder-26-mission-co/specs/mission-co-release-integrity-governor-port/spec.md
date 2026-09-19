# Spec — Mission CO Release Integrity & Progressive Honesty Governor Port (SPEC-0098)

## Requirement: Release integrity receipt

The system SHALL seal `CO-RCPT-*` receipts with canonical nine-field SHA-256 body including `planId`, `decision` (PASS|DENY|HOLD), `releaseId`, `integrityDigest`, and `PRODUCTION_READY: NO`. Attached frozen fields SHALL include `honestyMode` (HOLD|PROMOTE|ROLLBACK_HINT), optional `attestDigest` / `bindDigest` / `linkDigest`, `claims[]` `{ claimId, claimType?, digest? }`, `reasons[]`, and `integrityPlanDigest`.

## Requirement: Fail-closed policy gate

The gate SHALL require `planId`, `releaseId`, and `honestyMode` ∈ {HOLD, PROMOTE, ROLLBACK_HINT}; require sha256 `integrityDigest` or non-empty `claims[]`; optionally accept prior CN `attestDigest`, CM `bindDigest`, CL `linkDigest`; ALWAYS_DENY Fundacion; DENY Law VI secrets; DENY claims of PRODUCTION_READY=YES flip, Argo/Flagger product, real canary, progressive-delivery SaaS, or GH Enterprise enforcement; reject empty plans, oversize claim lists, and invalid or tampered digests.

## Requirement: Release integrity port

`ReleaseIntegrityPort.govern(plan)` (and alias `evaluate(plan)`) SHALL evaluate the gate; on valid plans map PROMOTE→PASS and HOLD|ROLLBACK_HINT→HOLD; emit PASS, DENY, or HOLD with a sealed receipt; store successful decisions by planId in memory; and expose `verifyTrail()`. The port SHALL NOT use network, GH API, real canary traffic, or Argo/Flagger control planes. Human remains authority on irreversible promote.

## Requirement: Non-claims

The package SHALL NOT claim Argo/Flagger progressive-delivery SaaS, real canary, progressive-delivery product, GH Enterprise enforcement, Fundacion writes, or `PRODUCTION_READY=YES`. L17–L25 remain CLOSED; L26 remains OPEN (Audit + CL + CM + CN MEASURED · CO in progress · CP pending).

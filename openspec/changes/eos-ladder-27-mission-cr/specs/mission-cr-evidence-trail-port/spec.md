# Spec — Mission CR Evidence Trail Ritual Binding Port (SPEC-0101)

## Requirement: Evidence trail receipt

The system SHALL seal `CR-RCPT-*` receipts with canonical nine-field SHA-256 body including `planId`, `decision` (PASS|DENY), `trailId`, `trailDigest`, and `PRODUCTION_READY: NO`. Attached frozen fields SHALL include `trailMode` (FIXTURE|LIVE), `linkCount`, optional `verifyResult` / `linksSummary`, `reasons[]`, and `trailSealHash`.

## Requirement: Fail-closed policy gate

The gate SHALL require `planId`, `trailMode` ∈ {FIXTURE, LIVE}, and a `trail` object; ALWAYS_DENY Fundacion; DENY Law VI secrets; DENY claims of PRODUCTION_READY=YES flip, SIEM product, production data lake, WORM SaaS, or GH Enterprise enforcement on operator label surfaces; reject empty plans, oversize reasons, and unsupported trail kinds.

## Requirement: Evidence trail port

`EvidenceTrailPort.govern(plan)` (and aliases `verify(plan)` / `evaluate(plan)`) SHALL evaluate the gate; validate append-only CL→CM→CN linkage (order, `prevLinkHash` chain, cross-port refs, LIVE dirty/lag/sampleOnly rules, trailSealHash integrity, trailId replay registry); emit PASS or DENY with a sealed receipt; store successful decisions by planId in memory; and expose `verifyTrail()`. The port SHALL NOT mutate CL/CM/CN state, SHALL NOT use network or GH API, and SHALL NOT add `docs/schemas/**/*.json`.

## Requirement: Non-claims

The package SHALL NOT claim SIEM, production data lake, WORM SaaS, Sigstore, GHE enforcement, auto-close of L26, new schemas JSON, Fundacion writes, `PRODUCTION_READY=YES`, reopen of L17–L26, or L27 closeout. L27 remains OPEN (Audit MEASURED · CQ MEASURED · CR in progress · CS–CU pending). Port green ≠ L27 closeout.

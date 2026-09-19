# Spec — Mission CM Evidence Binding & Claim Custody Port (SPEC-0096)

## Requirement: Evidence binding receipt

The system SHALL seal `CM-RCPT-*` receipts with canonical nine-field SHA-256 body including `planId`, `decision` (PASS|DENY), `claimCount`, `claimsDigest`, and `PRODUCTION_READY: NO`. Attached frozen fields SHALL include `claims[]` `{ claimId, evidenceDigest, linkDigest?, specId?, codePath? }`, `reasons[]`, and `bindingDigest`.

## Requirement: Fail-closed policy gate

The gate SHALL require `planId`; require 1..CM_MAX claims with valid `claimId` and sha256 `evidenceDigest` (optional prior CL `linkDigest` when present); ALWAYS_DENY Fundacion targets; DENY Law VI secrets; DENY labels claiming WORM SaaS, external audit product, SIEM retention SaaS, production data lake, or GH Enterprise enforcement; reject empty plans, oversize claim sets, and invalid or tampered digests.

## Requirement: Evidence binding port

`EvidenceBindingPort.bind(plan)` (alias `claim`) SHALL evaluate the gate, hermetically bind claimId → evidenceDigest (+ optional CL linkDigest), emit PASS or DENY with a sealed receipt, store successful bindings by planId in memory, and expose `verifyTrail()` for hash-chain custody. The port SHALL NOT use network or GH API.

## Requirement: Non-claims

The package SHALL NOT claim WORM SaaS, external audit product, SIEM retention SaaS, production data lake, GH Enterprise enforcement, Fundacion writes, or `PRODUCTION_READY=YES`. L17–L25 remain CLOSED; L26 remains OPEN (Audit + CL MEASURED · CM in progress · CN–CP pending).

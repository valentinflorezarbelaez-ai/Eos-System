# Spec — Mission CJ Continuous Adversarial Verification Port (SPEC-0093)

## Requirement: Adversarial verification receipt

The system SHALL seal `CJ-RCPT-*` receipts with canonical nine-field SHA-256 body including `probeId`, `decision` (PASS|CHALLENGE|DENY), `targetCount`, `findingsDigest`, and `PRODUCTION_READY: NO`. Attached frozen fields SHALL include `targets[]` `{ claimId, claimedStatus }`, `findings[]` `{ severity, message }`, `reasons[]`, and `probeDigest`.

## Requirement: Fail-closed policy gate

The gate SHALL require `probeId`; require 1..CJ_MAX targets with valid `claimId` and `claimedStatus` (MEASURED|UNKNOWN|BLOCKED); ALWAYS_DENY Fundacion targets; DENY Law VI secrets; DENY labels claiming GH Enterprise enforcement; reject empty probes and oversize targets.

## Requirement: Adversarial verification port

`AdversarialVerificationPort.probe(plan)` SHALL evaluate the gate, hermetically challenge MEASURED claims (FAIL if evidenceDigest missing/tampered; WARN on weak evidence; PASS when consistent), emit PASS, CHALLENGE, or DENY with a sealed receipt, store successful probes by id in memory, and expose `verifyTrail()` for hash-chain custody. The port SHALL NOT use network or GH API.

## Requirement: Non-claims

The package SHALL NOT claim red-team consulting product capability, GH Enterprise enforcement, Fundacion writes, or `PRODUCTION_READY=YES`. L17–L24 remain CLOSED; L25 remains OPEN (Audit + CG + CH + CI MEASURED · CJ in progress · CK pending).

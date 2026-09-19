# Spec — Mission CL Spec↔Code Traceability Graph Port (SPEC-0095)

## Requirement: Spec↔Code traceability receipt

The system SHALL seal `CL-RCPT-*` receipts with canonical nine-field SHA-256 body including `planId`, `decision` (PASS|DENY), `nodeCount`, `nodesDigest`, and `PRODUCTION_READY: NO`. Attached frozen fields SHALL include `nodes[]` `{ specId, codePath?, moduleId?, evidenceDigest? }`, `reasons[]`, and `graphDigest`.

## Requirement: Fail-closed policy gate

The gate SHALL require `planId`; require 1..CL_MAX nodes with valid `specId` and (`codePath` or `moduleId`); ALWAYS_DENY Fundacion targets; DENY Law VI secrets; DENY labels claiming full LSP/IDE product, GitHub code search, or GH Enterprise enforcement; reject empty plans, oversize graphs, and invalid evidenceDigest hex.

## Requirement: Spec↔Code traceability port

`SpecCodeTraceabilityPort.link(plan)` (alias `trace`) SHALL evaluate the gate, hermetically bind SPEC ids to code surfaces, emit PASS or DENY with a sealed receipt, store successful graphs by planId in memory, and expose `verifyTrail()` for hash-chain custody. The port SHALL NOT use network or GH API.

## Requirement: Non-claims

The package SHALL NOT claim full LSP/IDE product capability, GitHub code search, GH Enterprise enforcement, Fundacion writes, or `PRODUCTION_READY=YES`. L17–L25 remain CLOSED; L26 remains OPEN (Audit MEASURED · CL in progress · CM–CP pending).

# Spec — Mission CG External Tool / MCP Federation Port (SPEC-0090)

## Requirement: Federation receipt

The system SHALL seal `CG-RCPT-*` receipts with canonical nine-field SHA-256 body including `federationId`, `decision` (ALLOW|DENY), `toolCount`, optional `toolCallDigest`, and `PRODUCTION_READY: NO`. Attached frozen fields SHALL include `toolIds[]`, `allowlist[]`, and `reasons[]`.

## Requirement: Fail-closed policy gate

The gate SHALL require `federationId`, reject empty plans/tools/allowlists, reject unrestricted `*` allow-all, enforce MCP-style tool id pattern, require allowlist coverage of every requested tool, enforce max tools (default 32), ALWAYS_DENY Fundacion targets, and DENY Law VI secrets.

## Requirement: Federation port

`ExternalToolFederationPort.federate(plan)` SHALL evaluate the gate, emit ALLOW or DENY with a sealed receipt, store successful federations by id, and expose `verifyTrail()` for hash-chain custody. The port SHALL NOT perform live MCP network calls.

## Requirement: Non-claims

The package SHALL NOT claim unrestricted tool proxy, Fundacion writes, or `PRODUCTION_READY=YES`. L17–L24 remain CLOSED; L25 remains OPEN (Audit MEASURED · CG in progress · CH–CK pending).

# Spec — Mission CI Human Authority Escalation Federation Port (SPEC-0092)

## Requirement: Escalation federation receipt

The system SHALL seal `CI-RCPT-*` receipts with canonical nine-field SHA-256 body including `escalationId`, `decision` (ESCALATE|HOLD|DENY), `irreversibilityClass`, `operatorDecision`, and `PRODUCTION_READY: NO`. Attached frozen fields SHALL include `projectId`, `missionId`, `reasons[]`, and `escalationDigest`.

## Requirement: Fail-closed policy gate

The gate SHALL require `escalationId`, `projectId`, and `missionId`; validate `operatorDecision` (APPROVE|REJECT|DEFER) and `irreversibilityClass` enums; require explicit human APPROVE or REJECT for IRREVERSIBLE actions (never auto-APPROVE); ALWAYS_DENY Fundacion targets; DENY Law VI secrets; reject empty plans and oversize reasons.

## Requirement: Escalation federation port

`HitlEscalationFederationPort.escalate(plan)` SHALL evaluate the gate, emit ESCALATE, HOLD, or DENY with a sealed receipt, store successful escalations by id in memory, and expose `verifyTrail()` for hash-chain custody. The port SHALL NOT auto-approve irreversible actions; human remains authority.

## Requirement: Non-claims

The package SHALL NOT claim autonomous approval of irreversible actions, Fundacion writes, or `PRODUCTION_READY=YES`. Human remains authority. L17–L24 remain CLOSED; L25 remains OPEN (Audit + CG + CH MEASURED · CI in progress · CJ–CK pending).

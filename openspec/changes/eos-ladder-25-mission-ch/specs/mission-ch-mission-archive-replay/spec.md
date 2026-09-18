# Spec — Mission CH Long-Horizon Mission Archive & Replay Port (SPEC-0091)

## Requirement: Archive/replay receipt

The system SHALL seal `CH-RCPT-*` receipts with canonical nine-field SHA-256 body including `archiveId`, `decision` (ARCHIVE|REPLAY|DENY), `entryCount`, optional `trailDigest`, and `PRODUCTION_READY: NO`. Attached frozen fields SHALL include `trailEntries[]` { missionId, receiptId, digest }, `reasons[]`, and optional `replayCursor`.

## Requirement: Fail-closed policy gate

The gate SHALL require `archiveId`, reject empty trails, enforce missionId/receiptId patterns, require digests of 64 lowercase hex, enforce max entries (default 64), ALWAYS_DENY Fundacion targets (including in trail entries), and DENY Law VI secrets.

## Requirement: Archive & replay port

`MissionArchiveReplayPort.archive(plan)` and `.replay(plan)` SHALL evaluate the gate, emit ARCHIVE, REPLAY, or DENY with a sealed receipt, store successful archives by id in memory, and expose `verifyTrail()` for hash-chain custody. The port SHALL NOT persist a disk lake or act as SIEM retention SaaS.

## Requirement: Non-claims

The package SHALL NOT claim production data lake, SIEM retention SaaS, Fundacion writes, or `PRODUCTION_READY=YES`. L17–L24 remain CLOSED; L25 remains OPEN (Audit + CG MEASURED · CH in progress · CI–CK pending).

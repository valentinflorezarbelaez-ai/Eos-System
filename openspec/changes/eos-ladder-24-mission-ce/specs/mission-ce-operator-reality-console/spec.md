# Spec — Mission CE Sovereign Operator Reality Console Port (SPEC-0088)

## Requirements

### R1 — Sealed receipt
THE SYSTEM SHALL emit nine-field sealed `CE-RCPT-*` receipts hashed with SHA-256 via `node:crypto`, with `PRODUCTION_READY=NO` and `fundacionDelta=0`, exposing `consoleId`, `snapshotAt`, `entries[]` (ladder, satellite?, status, evidenceRef?), `summary` counts, `decision`, and `reasons[]`.

### R2 — Policy gate
WHEN a console snapshot plan is submitted, THE SYSTEM SHALL reject empty consoles, missing/invalid consoleId, invalid status (not MEASURED|UNKNOWN|BLOCKED), unknown ladder ids (outside L11–L24), oversized entry lists, plain secrets (Law VI), and Fundacion targets (`FUNDACION_ALWAYS_DENY`).

### R3 — Snapshot decision
WHEN a valid plan is accepted, THE SYSTEM SHALL decide VIEW, aggregate MEASURED/UNKNOWN/BLOCKED summary counts, compute `rootDigest`, store by console id, and seal a CE receipt — WITHOUT calling network/SIEM/APM APIs and WITHOUT touching Fundacion trees.

### R4 — Trail custody
THE SYSTEM SHALL verify sequential receipt hash chaining via `verifyTrail()` and detect tampering fail-closed.

### R5 — NON-CLAIMS
THE SYSTEM SHALL NOT claim full SIEM/APM, production ops center, Fundacion writes, PRODUCTION_READY=YES, tip-refresh, or CF scope.

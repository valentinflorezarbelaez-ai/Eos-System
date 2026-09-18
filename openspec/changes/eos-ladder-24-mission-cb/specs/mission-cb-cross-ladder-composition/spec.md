# Spec — Mission CB Cross-Ladder Composition Orchestrator Port (SPEC-0085)

## Requirements

### R1 — Sealed receipt
THE SYSTEM SHALL emit nine-field sealed `CB-RCPT-*` receipts hashed with SHA-256 via `node:crypto`, with `PRODUCTION_READY=NO` and `fundacionDelta=0`.

### R2 — Policy gate
WHEN a composition plan is submitted, THE SYSTEM SHALL reject empty plans, unknown satellite ids, ladder/satellite mismatches, oversized plans, plain secrets (Law VI), and Fundacion targets (`FUNDACION_ALWAYS_DENY`).

### R3 — Hermetic compose
WHEN a valid plan is accepted, THE SYSTEM SHALL simulate composition by emitting ordered `STAGE-SEAL-<satellite>-<sha16>` stubs, chain digests, compute `rootDigest`, store by composition id, and seal a CB receipt — WITHOUT invoking full BR–BZ runtimes.

### R4 — Trail custody
THE SYSTEM SHALL verify sequential receipt hash chaining via `verifyTrail()` and detect tampering fail-closed.

### R5 — NON-CLAIMS
THE SYSTEM SHALL NOT claim Airflow/Temporal enterprise orchestration, general AGI planning, PRODUCTION_READY=YES, Fundacion writes, tip-refresh, or CC–CF scope.

## Allowed ladders / satellites
- L22: BR–BV
- L23: BW–BZ

# Spec — Mission CC Mission Economics & Portfolio Budget Governor Port (SPEC-0086)

## Requirements

### R1 — Sealed receipt
THE SYSTEM SHALL emit nine-field sealed `CC-RCPT-*` receipts hashed with SHA-256 via `node:crypto`, with `PRODUCTION_READY=NO` and `fundacionDelta=0`.

### R2 — Policy gate
WHEN a portfolio envelope plan is submitted, THE SYSTEM SHALL reject empty allocations, invalid/non-negative-violating envelopes, unknown mission ids, oversized plans, plain secrets (Law VI), and Fundacion targets (`FUNDACION_ALWAYS_DENY`).

### R3 — Budget decision
WHEN a valid plan is accepted, THE SYSTEM SHALL sum allocation latency/cost/risk, decide ALLOW | THROTTLE | DENY against envelope budgets, compute `rootDigest`, store by portfolio id, and seal a CC receipt — WITHOUT calling cloud billing APIs.

### R4 — Trail custody
THE SYSTEM SHALL verify sequential receipt hash chaining via `verifyTrail()` and detect tampering fail-closed.

### R5 — NON-CLAIMS
THE SYSTEM SHALL NOT claim FinOps SaaS, cloud billing integration, PRODUCTION_READY=YES, Fundacion writes, tip-refresh, or CD–CF scope.

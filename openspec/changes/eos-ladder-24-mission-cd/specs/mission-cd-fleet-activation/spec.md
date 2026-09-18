# Spec — Mission CD Fleet Project Registry & Governed Activation Port (SPEC-0087)

## Requirements

### R1 — Sealed receipt
THE SYSTEM SHALL emit nine-field sealed `CD-RCPT-*` receipts hashed with SHA-256 via `node:crypto`, with `PRODUCTION_READY=NO` and `fundacionDelta=0`, exposing `projectId`, `projectSsotDigest`, `allowedMissions[]`, `deniedMissions[]`, `decision`, and `reasons[]`.

### R2 — Policy gate
WHEN an activation plan is submitted, THE SYSTEM SHALL reject empty allowlists, missing/invalid projectId, bad SSOT digests (not 64 hex), unknown mission ids, oversized allowlists, plain secrets (Law VI), and Fundacion targets (`FUNDACION_ALWAYS_DENY`).

### R3 — Activation decision
WHEN a valid plan is accepted, THE SYSTEM SHALL decide ALLOW, bind `projectSsotDigest` → allowed mission ids, compute `rootDigest`, store by project id, and seal a CD receipt — WITHOUT calling Kubernetes/cloud control-plane APIs and WITHOUT touching Fundacion trees.

### R4 — Trail custody
THE SYSTEM SHALL verify sequential receipt hash chaining via `verifyTrail()` and detect tampering fail-closed.

### R5 — NON-CLAIMS
THE SYSTEM SHALL NOT claim Kubernetes multi-cluster control plane, Fundacion writes, PRODUCTION_READY=YES, tip-refresh, or CE–CF scope.

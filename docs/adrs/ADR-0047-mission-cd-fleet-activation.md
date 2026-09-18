# ADR-0047 — Mission CD Fleet Project Registry & Governed Activation Port

- **Status:** Accepted — local governed (Ladder 24 Satellite 3)
- **Date:** 2026-09-18
- **Deciders:** EOS local governed use (Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric)
- **Spec:** SPEC-0087

## Context

Projects registry & dossiers exist. EOS lacked a Layer-0 governed activation port that binds project SSOT digests → mission allowlists with sealed receipts and without Fundacion bleed (`CD-RCPT-*`).

Mission CD delivers a pure Layer-0 Fleet Activation Port that:
1. Accepts activation plans with projectId + 64-hex SSOT digest + mission allowlist.
2. Validates plans fail-closed (empty allowlist, invalid projectId, bad digest, unknown mission ids, max missions, Law VI secrets, Fundacion).
3. Decides ALLOW | DENY and seals `CD-RCPT-*` receipts linking project SSOT → allowed mission ids.
4. Verifies hash-chained custody via `verifyTrail()`.
5. Does not call Kubernetes/cloud control-plane APIs; does not touch Fundacion trees.

## Decision

1. Implement three Layer-0 modules under `src/core/projects/`:
   - `fleet-activation-receipt.js`: Canonical nine-field SHA-256 sealed receipts (`CD-RCPT-*`) via `node:crypto`.
   - `fleet-activation-policy-gate.js`: Fail-closed activation validation.
   - `fleet-activation-port.js`: Unified port facade (`activate`, `verifyTrail`, `getActivation`).
2. Valid plan → ALLOW with allowlist as `allowedMissions`; gate reject → DENY with missions in `deniedMissions`.
3. Exclude satellite test suite `tests/eos-cd-fleet-activation-port.test.js` from default slim discovery; opt-in via `npm run test:mission-cd` / `test:fleet-activation`.
4. Maintain strict non-claims: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, ≠ Kubernetes multi-cluster CP / ≠ Fundacion touch.
5. Do **not** rewrite freeze/matrix/dirty-defer/m4 tip pins in this mission (freeze tip stays on CC tip `94b26b9…` until SEPARATE tip-refresh).

## Alternatives considered AND REJECTED

### A. Kubernetes multi-cluster control plane embedding
**Rejected.** EOS does not claim k8s multi-cluster orchestration.
Technical reason: Local Layer-0 hermetic SSOT→allowlist binding with sealed digests is sufficient without cluster APIs.

### B. Writing into Fundacion trees during activation
**Rejected.** Fundacion Δ=0 ALWAYS_DENY invariant — activation must never bleed into Fundacion paths.

### C. Tip-refresh / freeze tip rewrite inside this mission
**Rejected.** Freeze/matrix tip pin stays on Mission CC tip until a SEPARATE tip-refresh after CD merges.

## Consequences

- **Positive:** Project SSOT → mission allowlist activation with chained CD receipts; ≥15 hermetic tests; zero secrets; Fundacion Δ=0; fleet operator fabric extended without k8s claims.
- **Negative:** Activation is a local governed binding — not a cluster scheduler.
- **Invariants Preserved:** `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI held; L17–L23 never reopen.

## NON-CLAIMS

- Fleet activation ≠ Kubernetes multi-cluster control plane
- Fleet activation ≠ Fundacion touch (Δ=0)
- PRODUCTION_READY=NO (never flip in this mission)
- ≠ tip-refresh; ≠ Missions CE–CF

# Proposal — Mission Z: Governed Target Flight Sandbox & Level 2 Precondition Verifier (SPEC-0031)

## Why

Ladder 12 is CLOSED (V→Y). The control plane (W session × V remediation × X shell) and T-gate L2 write gateway live separately: there is no **sandbox of first flight** that verifies the six constitutional Level-2 preconditions, captures a reversible snapshot, applies a governed mutation **only** in an ephemeral fixture, seals a HashChainedLedger receipt, and atomically rolls back on verify fail — without vibe, without opening real Fundacion.

Ladder 13 audit (SPEC-0031 DoD) names this the axis of Level 2 Governed Autonomy. Z implements the sandbox + verifier; it does **not** open Fundacion Δ.

## What

1. `src/core/sandbox/precondition-gatekeeper.js` — `createPreconditionGatekeeper` / `evaluate` → `{ ok, missing[], PRODUCTION_READY:'NO' }`; frozen `PRECONDITION_KEYS` (REGISTERED → LEVEL_2_AUTHORIZED); fail-closed.
2. `src/core/sandbox/flight-rollback-engine.js` — `createFlightRollbackEngine`; `captureSnapshot` / `rollback`; default SHA-256 of sorted path→content; hermetic in-memory tree; typed fail-closed errors.
3. `src/core/sandbox/target-flight-sandbox.js` — `createTargetFlightSandbox` kind `eos-governed-target-flight-sandbox`; injects gatekeeper + rollbackEngine + optional T-style writeGateway + HashChainedLedger; lifecycle IDLE → PREFLIGHT → SANDBOX_ACTIVE → MUTATING → VERIFYING → COMMITTED | ROLLED_BACK | ESCALATED_HITL | DENIED; real Fundacion ALWAYS DENY; `TARGET_FLIGHT_PRODUCTION_READY='NO'`.
4. Suite `tests/eos-z-target-flight-sandbox.test.js` (Z1–Z14 PASS + Z15 SKIP + Z16); slim-exclude basename; `npm run test:target-flight` / `test:mission-z`.
5. OpenSpec change + release report + bootstrap + idempotent patcher.
6. Prefer **not** mutating `src/core/write-barrier/*` or `external-write-gateway.js` (inject/compose).

## DoD

Branch `grok/mission-z-governed-target-flight-sandbox` from main tip starting with `e2ab1ec` (tip refresh post-#186 = PR #187); tests green (≥12 PASS, ≤1 SKIP, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0; no AI commit attribution.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- Real Fundacion writes / Documents/Fundacion mutation
- PRODUCTION_READY flip
- Weakening write-barrier always-deny for real Fundacion
- Rewriting write-barrier or external-write-gateway cores (prefer inject)
- Cursor CloudAgent
- Raising TR-01 (prefer exclude-from-slim)
- New npm dependencies
- Claiming simulation ≡ Fundacion Δ opened

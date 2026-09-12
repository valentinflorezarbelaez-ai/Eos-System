# Spec — Multi-Session Autonomy Coordinator (SPEC-0040 / Mission AI)

## Purpose

Provide a hermetic, fail-closed **multi-session autonomy coordinator** with
durable create/suspend/resume, custody snapshots, generation counters, drift
detection, Law VI sanitization, and optional AF loop injection — without
enabling unbounded autonomy products or live network in CI.

## Requirements

### R1 — Factory & kind
- `createMultiSessionAutonomyCoordinator(options)` returns object with
  `kind: 'eos-multi-session-autonomy-coordinator'` and `PRODUCTION_READY: 'NO'`.

### R2 — Session lifecycle
- `createSession(meta?)`, `suspendSession(id)`, `resumeSession(id)`,
  `getSession(id)`, `listSessions()`.

### R3 — Durable store port
- Default in-memory store; injectable `{ load, save, list }` for hermetic fakes.

### R4 — Drift / fail-closed
- Resume MUST restore same custody chain / generation counter (no silent drift).
- Snapshot hash/generation mismatch → `SESSION_DRIFT`.
- Missing session → `UNKNOWN_SESSION`.
- Suspend twice → fail-closed `INVALID_STATE`.
- Resume ACTIVE → fail-closed `INVALID_STATE` (or idempotent when
  `resumeActiveIdempotent:true`, documented).

### R5 — Optional runCycle
- `runCycle(sessionId, intent)` injects AF loop when provided; missing →
  `MISSING_DEP`; requires ACTIVE session.

### R6 — HITL
- Injectable HITL; default deny for privileged ops when `options.requireHitl`.

### R7 — Law VI
- Redact secrets from getState/receipts.
- No static vendor-key literals in source/tests (runtime synth only).

### R8 — Custody receipt
- Receipt on create/suspend/resume/runCycle with `PRODUCTION_READY:'NO'`.

### R9 — Honesty
- `health()` / `getState()` carry NON-CLAIM flags.
- Do NOT implement AJ/AK/AL/AM.
- Fundacion ALWAYS DENY; no CloudAgent; no live network in CI.

### R10 — Tests
- Hermetic suite ≥12 PASS; slim-excluded basename
  `eos-ai-multi-session-autonomy.test.js`.

## Non-requirements
- AJ/AK/AL/AM, PRODUCTION_READY flip, CloudAgent, real Fundacion writes,
  unbounded multi-session agent fleet.

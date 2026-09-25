# ADR-0113 — Mission DZ Sovereign Process Manager / Saga Orchestration Port

- **Status:** Accepted — local governed (Ladder 34 Mission DZ / SPEC-0136)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Process Orchestration, CQRS Projection & Dead-Letter Governance Fabric)
- **Spec:** SPEC-0136 (Mission DZ)
- **Prior ADRs:** ADR-0112 (Ladder 34 Maturity Gap Audit), ADR-0111 (Mission DY / L33 Closeout), ADR-0107 (Mission DU Domain Event Publisher)

## Context

Ladder 34 is **OPEN** (Audit MEASURED · DZ–ED pending) after tip-open #459 + tip-refresh #460 (freeze soft-observe pin `b382d29b`). Ladders 30–33 remain formally **CLOSED** — **NEVER reopen L30–L33**.

After Ladder 33 closed the domain-event publisher → transactional outbox → idempotent consumer → circuit breaker → seam-pack chain, multi-step process / saga orchestration across aggregates must advance from already-sealed L33 domain events **without** reintroducing dual-write chaos. A Layer-0 sovereign process manager / saga orchestration port is required so long-running processes seal `DZ-RCPT-*` receipts with fail-closed hermetic compensation.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This mission does **not** tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Implement Mission DZ (SPEC-0136) as a Pure Layer-0 triad under `src/core/composition/`:
   - `process-manager-saga-receipt.js` — sealed `DZ-RCPT-*` + freeze soft-observe `b382d29b` + sagaHold
   - `process-manager-saga-policy-gate.js` — fail-closed govern preconditions
   - `process-manager-saga-port.js` — facade (`govern`, `verifyTrail`)
2. Port `govern(input)` accepts `planId`, `changeId`, `ritualMode` (`ACTIVE`|`HOLD`), and `processInstance` `{ processId, processType, step, triggerEvent { eventType, aggregateId, payload }, compensationPlan? }`.
3. Soft-observe freeze pinShort `b382d29b` with `tipRewriteRefused`, `l34AutoCloseRefused`, `dualWriteRefused`, `outboxMutationRefused`, `schemasAtCeiling: true`.
4. Policy **DENY** on: missing process, secrets, PRODUCTION_READY flip, Fundacion target, hard-delete/mass-prune, tip-rewrite, schema-json add, dual-write, outbox mutation, reopen L30–L33, L34 auto-close, GHE claims, network write, auto-seal without human gate.
5. **HOLD** / **PASS** emit `processDigest` via `sha256Canonical`; trail chains via `prevReceiptHash`.
6. Fail-closed **COMPENSATE** / **DENY** path is hermetic in-memory only.
7. **PASS ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY**.
8. Node built-ins only (`node:crypto`). No new schema JSON. No CloudAgent.

### Non-claims

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L33 | CLOSED — NEVER reopen |
| L34 | OPEN (Audit MEASURED · DZ–ED pending) |
| Freeze pin | `b382d29b` (soft-observe only; NOT rewritten) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed process/saga step ≠ network write ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |

## Alternatives Considered AND REJECTED

- Dual-write process advancement (DB + bus in one step) — REJECTED: reintroduces dual-write chaos; L33 outbox already seals durable intent.
- Network / remote saga dispatch from this port — REJECTED: PASS ≠ network write; hermetic in-memory only.
- Adding `docs/schemas/**/*.json` for saga contracts — REJECTED: schemas AT_CEILING 35/35.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: local governed seal only.
- Reopening L30–L33 or auto-closing L34 — REJECTED: L30–L33 NEVER reopen; L34 auto-close refused (DZ–ED pending).
- Tip-refresh / tip-seal / freeze `main_tip` rewrite in this PR — REJECTED: tip-refresh post-DZ is SEPARATE next.
- CloudAgent path — REJECTED: Antigravity-first, local only.

## Consequences

- Positive: First Ladder 34 satellite seals multi-step process/saga orchestration without dual-write chaos, with fail-closed hermetic compensation receipts.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets), Law VII (professional English), L30–L33 CLOSED, freeze pin `b382d29b` soft-observed only, schemas AT_CEILING 35/35.
- Follow-ups: Mission EA (CQRS Read-Model Projection), EB (Dead-Letter Quarantine), EC (Event Compatibility Gate), ED (L34 Seam-Pack Closeout). Tip-refresh post-DZ is SEPARATE.

## Links

- OpenSpec: `openspec/changes/eos-ladder-34-mission-dz/`
- Tests: `tests/eos-dz-process-manager-saga-port.test.js` (DZ1–DZ17)
- Patcher: `scripts/patch-mission-dz.mjs`
- Prior: ADR-0112 (L34 Audit), ADR-0107 (Mission DU)

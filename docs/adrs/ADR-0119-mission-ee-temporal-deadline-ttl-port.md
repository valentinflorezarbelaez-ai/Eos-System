# ADR-0119 — Mission EE Temporal Deadline & TTL Governance Port

- **Status:** Accepted — local governed (Ladder 35 Mission EE / SPEC-0141)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric)
- **Spec:** SPEC-0141 (Mission EE)
- **Prior ADRs:** ADR-0118 (Ladder 35 Maturity Gap Audit), ADR-0117 (Mission ED Ladder 34 Seam-Pack Closeout), ADR-0113 (Mission DZ Process Manager / Saga)

## Context

Ladder 35 is **OPEN** (Audit MEASURED · EE–EI pending) after tip-open #474 + tip-refresh #475 (freeze soft-observe pin `9600063c`). Ladders 30–34 remain formally **CLOSED** — **NEVER reopen L30–L34**.

Mission DZ seals process/saga step receipts (`DZ-RCPT-*`) but exposes no deadline, TTL, timer, or expiry surface. Long-running processes can advance without a fail-closed temporal bound. Mission EE seals hermetic deadline/TTL governance receipts (`EE-RCPT-*`) without binding live `setTimeout` / `setInterval` / network cron to the process lifetime.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This mission does **not** tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Implement Mission EE (SPEC-0141) as a Pure Layer-0 triad under `src/core/composition/`:
   - `temporal-deadline-ttl-receipt.js` — sealed `EE-RCPT-*` + freeze soft-observe `9600063c` + temporalHold
   - `temporal-deadline-ttl-policy-gate.js` — fail-closed govern preconditions
   - `temporal-deadline-ttl-port.js` — facade (`govern`, `verifyTrail`)
2. Port `govern(input)` accepts `planId`, `changeId`, `ritualMode` (`ACTIVE`|`HOLD`), and `deadline` `{ processId, deadlineAt (ISO), ttlMs?, clockSkewBudgetMs?, triggerEvent?, observedExpired? }`.
3. Soft-observe freeze pinShort `9600063c` with `tipRewriteRefused`, `l35AutoCloseRefused`, `l34ReopenRefused`, `liveTimerRefused`, `schemasAtCeiling: true`.
4. Policy **DENY** on: missing processId/deadlineAt, invalid ISO deadlineAt, secrets, PRODUCTION_READY flip, Fundacion target, hard-delete/mass-prune, tip-rewrite, schema-json add, live wall-clock scheduler / setTimeout / setInterval claims, reopen L30–L34, L35 auto-close, GHE claims, network write, auto-seal without human gate.
5. **HOLD** / **PASS** emit `deadlineDigest` via `sha256Canonical`; trail chains via `prevReceiptHash`.
6. **EXPIRE** when `observedExpired` is true — fail-closed sealed receipt; clock injected via input (not `Date.now` authority).
7. **PASS** seals hermetic deadline/TTL receipt only — **not** a live timer / cron.
8. **PASS ≠ live timer ≠ tip-refresh ≠ PRODUCTION_READY**.
9. Node built-ins only (`node:crypto`). No real timers that bind process lifetime. No CloudAgent.

### Non-claims

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L34 | CLOSED — NEVER reopen |
| L35 | OPEN (Audit MEASURED · EE–EI pending) |
| Freeze pin | `9600063c` (soft-observe only; NOT rewritten) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | sealed deadline/TTL ≠ live timer ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |

## Alternatives Considered AND REJECTED

- Binding live `setTimeout` / `setInterval` / network cron to process lifetime — REJECTED: PASS seals hermetic receipt only; live timers refused.
- Using `Date.now` as authority for EXPIRE — REJECTED: hermetic `observedExpired` injection via input only.
- Adding `docs/schemas/**/*.json` for deadline contracts — REJECTED: schemas AT_CEILING 35/35.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: local governed seal only.
- Reopening L30–L34 or auto-closing L35 — REJECTED: L30–L34 NEVER reopen; L35 auto-close refused (EE–EI pending).
- Tip-refresh / tip-seal / freeze `main_tip` rewrite in this PR — REJECTED: tip-refresh post-EE is SEPARATE next.
- CloudAgent path — REJECTED: Antigravity-first, local only.

## Consequences

- Positive: First Ladder 35 satellite seals temporal deadline / TTL governance without live timers, with hermetic PASS / HOLD / EXPIRE / DENY receipts chained from DZ process steps.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets), Law VII (professional English), L30–L34 CLOSED, freeze pin `9600063c` soft-observed only, schemas AT_CEILING 35/35.
- Follow-ups: Mission EF (Schedule Wake & Deferred Trigger). Tip-refresh post-EE is SEPARATE.

## Links

- OpenSpec: `openspec/changes/eos-ladder-35-mission-ee/`
- Tests: `tests/eos-ee-temporal-deadline-ttl-port.test.js` (EE1–EE17)
- Patcher: `scripts/patch-mission-ee.mjs`
- Prior: ADR-0118 (L35 Audit), ADR-0117 (Mission ED), ADR-0113 (Mission DZ)

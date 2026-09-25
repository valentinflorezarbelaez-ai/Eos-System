# ADR-0120 — Mission EF Schedule Wake & Deferred Trigger Port

- **Status:** Accepted — local governed (Ladder 35 Mission EF / SPEC-0142)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric)
- **Spec:** SPEC-0142 (Mission EF)
- **Prior ADRs:** ADR-0119 (Mission EE Temporal Deadline & TTL), ADR-0118 (Ladder 35 Maturity Gap Audit), ADR-0113 (Mission DZ Process Manager / Saga)

## Context

Ladder 35 is **OPEN** (Audit MEASURED · EE MEASURED · EF–EI pending) after tip-refresh #477 (freeze soft-observe pin `0a286ad8` — EE merge). Ladders 30–34 remain formally **CLOSED** — **NEVER reopen L30–L34**.

Mission EE seals hermetic deadline/TTL governance receipts (`EE-RCPT-*`) but exposes no schedule wake / deferred trigger surface. Multi-step sagas need governed wake-at-schedule triggers that consume L33 outbox/idempotent messaging + EE deadlines without unsupervised polling, live cron daemons, OS schedulers, or network wake. Mission EF seals hermetic deferred-wake receipts (`EF-RCPT-*`) without binding `setInterval` / cron daemon / OS scheduler / network wake to the process lifetime.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This mission does **not** tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Implement Mission EF (SPEC-0142) as a Pure Layer-0 triad under `src/core/composition/`:
   - `schedule-wake-deferred-receipt.js` — sealed `EF-RCPT-*` + freeze soft-observe `0a286ad8` + scheduleHold
   - `schedule-wake-deferred-policy-gate.js` — fail-closed govern preconditions
   - `schedule-wake-deferred-port.js` — facade (`govern`, `verifyTrail`)
2. Port `govern(input)` accepts `planId`, `changeId`, `ritualMode` (`ACTIVE`|`HOLD`), and `schedule` `{ scheduleId, wakeAt (ISO), deferredFromProcessId?, triggerKind (ONCE|DEFERRED), payloadDigest? }`.
3. Soft-observe freeze pinShort `0a286ad8` with `tipRewriteRefused`, `l35AutoCloseRefused`, `liveCronRefused`, `schemasAtCeiling: true`.
4. Policy **DENY** on: missing scheduleId/wakeAt, invalid ISO wakeAt, missing/invalid triggerKind, secrets, PRODUCTION_READY flip, Fundacion target, hard-delete/mass-prune, tip-rewrite, schema-json add, live cron / setInterval / OS scheduler / network wake claims, reopen L30–L34, L35 auto-close, GHE claims, network write, auto-seal without human gate.
5. **HOLD** / **PASS** emit `scheduleDigest` via `sha256Canonical`; trail chains via `prevReceiptHash`.
6. **PASS** seals hermetic deferred-wake receipt only — **not** a live cron / setInterval / OS scheduler / network wake.
7. **PASS ≠ live cron ≠ tip-refresh ≠ PRODUCTION_READY**.
8. Node built-ins only (`node:crypto`). No real cron daemons. No CloudAgent.

### Non-claims

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L34 | CLOSED — NEVER reopen |
| L35 | OPEN (Audit MEASURED · EE MEASURED · EF–EI pending) |
| Freeze pin | `0a286ad8` (soft-observe only; NOT rewritten) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | hermetic deferred-wake ≠ live cron ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |

## Alternatives Considered AND REJECTED

- Binding live `setInterval` / cron daemon / OS scheduler / network wake to process lifetime — REJECTED: PASS seals hermetic receipt only; live cron refused.
- Adding `docs/schemas/**/*.json` for schedule contracts — REJECTED: schemas AT_CEILING 35/35.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: local governed seal only.
- Reopening L30–L34 or auto-closing L35 — REJECTED: L30–L34 NEVER reopen; L35 auto-close refused (EF–EI pending).
- Tip-refresh / tip-seal / freeze `main_tip` rewrite in this PR — REJECTED: tip-refresh post-EF is SEPARATE next.
- CloudAgent path — REJECTED: Antigravity-first, local only.

## Consequences

- Positive: Second Ladder 35 satellite seals schedule wake / deferred trigger governance without live cron, with hermetic PASS / HOLD / DENY receipts chained from EE deadlines + DZ process steps.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets), Law VII (professional English), L30–L34 CLOSED, freeze pin `0a286ad8` soft-observed only, schemas AT_CEILING 35/35.
- Follow-ups: Mission EG (Long-Running Process Timeout Compensation). Tip-refresh post-EF is SEPARATE.

## Links

- OpenSpec: `openspec/changes/eos-ladder-35-mission-ef/`
- Tests: `tests/eos-ef-schedule-wake-deferred-port.test.js` (EF1–EF17)
- Patcher: `scripts/patch-mission-ef.mjs`
- Prior: ADR-0119 (Mission EE), ADR-0118 (L35 Audit), ADR-0113 (Mission DZ)

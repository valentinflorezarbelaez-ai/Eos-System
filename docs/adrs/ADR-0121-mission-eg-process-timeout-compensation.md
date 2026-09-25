# ADR-0121 — Mission EG Long-Running Process Timeout Compensation Port

- **Status:** Accepted — local governed (Ladder 35 Mission EG / SPEC-0143)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric)
- **Spec:** SPEC-0143 (Mission EG)
- **Prior ADRs:** ADR-0120 (Mission EF Schedule Wake & Deferred Trigger), ADR-0119 (Mission EE Temporal Deadline & TTL), ADR-0118 (Ladder 35 Maturity Gap Audit), ADR-0113 (Mission DZ Process Manager / Saga)

## Context

Ladder 35 is **OPEN** (Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending) after tip-refresh #479 (freeze soft-observe pin `73252208` — EF merge). Ladders 30–34 remain formally **CLOSED** — **NEVER reopen L30–L34**.

Mission EE seals hermetic deadline/TTL receipts (`EE-RCPT-*`) and Mission EF seals deferred-wake receipts (`EF-RCPT-*`), but neither exposes a timeout-compensation surface for long-running processes. When a deadline/TTL expires on a long-running process, fail-closed compensation receipts must be sealed hermetically (ties to EE deadline + DZ saga compensation). Mission EG seals hermetic timeout-compensation receipts (`EG-RCPT-*`) without unsupervised compensate, live saga rewrite, or network write.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This mission does **not** tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Implement Mission EG (SPEC-0143) as a Pure Layer-0 triad under `src/core/composition/`:
   - `process-timeout-compensation-receipt.js` — sealed `EG-RCPT-*` + freeze soft-observe `73252208` + compensationHold
   - `process-timeout-compensation-policy-gate.js` — fail-closed govern preconditions
   - `process-timeout-compensation-port.js` — facade (`govern`, `verifyTrail`)
2. Port `govern(input)` accepts `planId`, `changeId`, `ritualMode` (`ACTIVE`|`HOLD`), and `compensation` `{ processId, timeoutReason, relatedDeadlineReceiptId?, compensationPlan, observedTimedOut? }`.
3. Soft-observe freeze pinShort `73252208` with `tipRewriteRefused`, `l35AutoCloseRefused`, `unsupervisedCompensateRefused`, `schemasAtCeiling: true`.
4. Policy **DENY** on: missing processId/timeoutReason/compensationPlan, secrets, PRODUCTION_READY flip, Fundacion target, hard-delete/mass-prune, tip-rewrite, schema-json add, unsupervised compensate / live saga rewrite claims, reopen L30–L34, L35 auto-close, GHE claims, network write, auto-seal without human gate.
5. **HOLD** / **PASS** / **COMPENSATE** emit `compensationDigest` via `sha256Canonical`; trail chains via `prevReceiptHash`.
6. **COMPENSATE** (when `observedTimedOut=true` or `requestCompensate`) seals fail-closed hermetic in-memory only — **not** a live saga rewrite / network write.
7. **PASS** seals hermetic timeout-compensation receipt only — **not** unsupervised compensate.
8. **COMPENSATE / PASS ≠ live saga rewrite ≠ unsupervised compensate ≠ tip-refresh ≠ PRODUCTION_READY**.
9. Node built-ins only (`node:crypto`). No live saga mutation. No CloudAgent.

### Non-claims

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L34 | CLOSED — NEVER reopen |
| L35 | OPEN (Audit MEASURED · EE MEASURED · EF MEASURED · EG–EI pending) |
| Freeze pin | `73252208` (soft-observe only; NOT rewritten) |
| Ceiling | schemas AT_CEILING 35/35 |
| COMPENSATE | fail-closed hermetic in-memory ≠ live saga rewrite ≠ tip-refresh ≠ PRODUCTION_READY |
| PASS | hermetic timeout-compensation ≠ unsupervised compensate ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |

## Alternatives Considered AND REJECTED

- Unsupervised / automatic live saga rewrite on timeout — REJECTED: COMPENSATE seals fail-closed hermetic receipt only.
- Adding `docs/schemas/**/*.json` for compensation contracts — REJECTED: schemas AT_CEILING 35/35.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: local governed seal only.
- Reopening L30–L34 or auto-closing L35 — REJECTED: L30–L34 NEVER reopen; L35 auto-close refused (EG–EI pending).
- Tip-refresh / tip-seal / freeze `main_tip` rewrite in this PR — REJECTED: tip-refresh post-EG is SEPARATE next.
- CloudAgent path — REJECTED: Antigravity-first, local only.

## Consequences

- Positive: Third Ladder 35 satellite seals long-running process timeout compensation without unsupervised compensate or live saga rewrite, with hermetic PASS / HOLD / COMPENSATE / DENY receipts chained from EE deadlines + DZ saga compensation + EF deferred wakes.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets), Law VII (professional English), L30–L34 CLOSED, freeze pin `73252208` soft-observed only, schemas AT_CEILING 35/35.
- Follow-ups: Mission EH–EI. Tip-refresh post-EG is SEPARATE.

## Links

- OpenSpec: `openspec/changes/eos-ladder-35-mission-eg/`
- Tests: `tests/eos-eg-process-timeout-compensation-port.test.js` (EG1–EG17)
- Patcher: `scripts/patch-mission-eg.mjs`
- Prior: ADR-0120 (Mission EF), ADR-0119 (Mission EE), ADR-0118 (L35 Audit), ADR-0113 (Mission DZ)

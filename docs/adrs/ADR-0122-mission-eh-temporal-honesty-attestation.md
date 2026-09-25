# ADR-0122 — Mission EH Temporal Honesty & Deadline Attestation Port

- **Status:** Accepted — local governed (Ladder 35 Mission EH / SPEC-0144)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Temporal Deadline, Schedule Wake & Long-Running Process Governance Fabric)
- **Spec:** SPEC-0144 (Mission EH)
- **Prior ADRs:** ADR-0121 (Mission EG Process Timeout Compensation), ADR-0120 (Mission EF Schedule Wake & Deferred Trigger), ADR-0119 (Mission EE Temporal Deadline & TTL), ADR-0118 (Ladder 35 Maturity Gap Audit)

## Context

Ladder 35 is **OPEN** (Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending) after tip-refresh #481 (freeze soft-observe pin `ff4b6d19` — EG merge). Ladders 30–34 remain formally **CLOSED** — **NEVER reopen L30–L34**.

Mission EE seals hermetic deadline/TTL receipts (`EE-RCPT-*`), Mission EF seals deferred-wake receipts (`EF-RCPT-*`), and Mission EG seals timeout-compensation receipts (`EG-RCPT-*`). None of those satellites yet attest that deadline/TTL/schedule/compensation receipts remain temporally honest (soft-observe freeze, no live-timer claims, PRODUCTION_READY=NO). Mission EH seals hermetic honesty attestation receipts (`EH-RCPT-*`) without claiming wall-clock authority.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This mission does **not** tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Implement Mission EH (SPEC-0144) as a Pure Layer-0 triad under `src/core/composition/`:
   - `temporal-honesty-attestation-receipt.js` — sealed `EH-RCPT-*` + freeze soft-observe `ff4b6d19` + attestationHold
   - `temporal-honesty-attestation-policy-gate.js` — fail-closed govern preconditions
   - `temporal-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
2. Port `govern(input)` accepts `planId`, `changeId`, `ritualMode` (`ACTIVE`|`HOLD`), and `attestation` `{ subjectReceiptId?, subjectKind (DEADLINE|SCHEDULE|COMPENSATION|COMPOSITE), honestyClaims: { softObserveFreeze, noLiveTimer, productionReadyNo, schemasAtCeiling } }`.
3. Soft-observe freeze pinShort `ff4b6d19` with `tipRewriteRefused`, `l35AutoCloseRefused`, `liveTimerClaimRefused`, `productionReadyFlipRefused`, `schemasAtCeiling: true`.
4. Policy **DENY** on: missing subjectKind/honestyClaims, secrets, PRODUCTION_READY flip, Fundacion target, hard-delete/mass-prune, tip-rewrite, schema-json add, live-timer honesty lie, reopen L30–L34, L35 auto-close, GHE claims, auto-seal without human gate.
5. **HOLD** / **PASS** emit `attestationDigest` via `sha256Canonical`; trail chains via `prevReceiptHash`.
6. **PASS** seals hermetic honesty attestation only — **not** wall-clock authority.
7. **PASS ≠ wall-clock authority ≠ tip-refresh ≠ PRODUCTION_READY**.
8. Node built-ins only (`node:crypto`). No live timers. No CloudAgent.

### Non-claims

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L34 | CLOSED — NEVER reopen |
| L35 | OPEN (Audit MEASURED · EE MEASURED · EF MEASURED · EG MEASURED · EH–EI pending) |
| Freeze pin | `ff4b6d19` (soft-observe only; NOT rewritten) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | hermetic honesty attestation ≠ wall-clock authority ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |

## Alternatives Considered AND REJECTED

- Claiming live timer / wall-clock authority as part of honesty attestation — REJECTED: PASS seals hermetic honesty attestation only.
- Adding `docs/schemas/**/*.json` for attestation contracts — REJECTED: schemas AT_CEILING 35/35.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: local governed seal only.
- Reopening L30–L34 or auto-closing L35 — REJECTED: L30–L34 NEVER reopen; L35 auto-close refused (EH–EI pending).
- Tip-refresh / tip-seal / freeze `main_tip` rewrite in this PR — REJECTED: tip-refresh post-EH is SEPARATE next.
- CloudAgent path — REJECTED: Antigravity-first, local only.

## Consequences

- Positive: Fourth Ladder 35 satellite attests temporal honesty of EE/EF/EG receipts without claiming wall-clock authority, with hermetic PASS / HOLD / DENY receipts chained from prior temporal satellites.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets), Law VII (professional English), L30–L34 CLOSED, freeze pin `ff4b6d19` soft-observed only, schemas AT_CEILING 35/35.
- Follow-ups: Mission EI. Tip-refresh post-EH is SEPARATE.

## Links

- OpenSpec: `openspec/changes/eos-ladder-35-mission-eh/`
- Tests: `tests/eos-eh-temporal-honesty-attestation-port.test.js` (EH1–EH17)
- Patcher: `scripts/patch-mission-eh.mjs`
- Prior: ADR-0121 (Mission EG), ADR-0120 (Mission EF), ADR-0119 (Mission EE), ADR-0118 (L35 Audit)

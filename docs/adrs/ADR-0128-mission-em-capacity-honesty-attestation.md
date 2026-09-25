# ADR-0128 — Mission EM Capacity Honesty & Admission Attestation Port

- **Status:** Accepted — local governed (Ladder 36 Mission EM / SPEC-0149)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Resource Isolation, Admission Control & Backpressure Governance Fabric)
- **Spec:** SPEC-0149 (Mission EM)
- **Prior ADRs:** ADR-0127 (Mission EL Resource Isolation Bulkhead), ADR-0126 (Mission EK Backpressure Load-Shed), ADR-0125 (Mission EJ Admission Control Intake), ADR-0124 (Ladder 36 Maturity Gap Audit), ADR-0122 (Mission EH Temporal Honesty — pattern mirror)

## Context

Ladder 36 is **OPEN** (Audit MEASURED · EJ MEASURED · EK MEASURED · EL MEASURED · EM this · EN pending) after tip-refresh #496 (freeze soft-observe pin `933f32ae` — EL #495 merge). Ladders 30–35 remain formally **CLOSED** — **NEVER reopen L30–L35**.

Mission EJ seals hermetic admission/intake quota receipts (`EJ-RCPT-*`), Mission EK seals load-shed receipts (`EK-RCPT-*`), and Mission EL seals bulkhead/isolation receipts (`EL-RCPT-*`). Soft-observe of freeze pins alone is **not** capacity truth (mirror EH vs soft-observe for temporal). Mission EM seals hermetic capacity/admission honesty attestation receipts (`EM-RCPT-*`) without claiming live metrics or wall-clock capacity authority.

Schemas remain **AT_CEILING 35/35** — do not add `docs/schemas/**/*.json`. This mission does **not** tip-refresh, tip-seal, or rewrite freeze `main_tip`.

## Decision

1. Implement Mission EM (SPEC-0149) as a Pure Layer-0 triad under `src/core/composition/`:
   - `capacity-honesty-attestation-receipt.js` — sealed `EM-RCPT-*` + freeze soft-observe `933f32ae` + attestationHold
   - `capacity-honesty-attestation-policy-gate.js` — fail-closed govern preconditions
   - `capacity-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
2. Port `govern(input)` accepts `planId`, `changeId`, `ritualMode` (`ACTIVE`|`HOLD`), and `attestation` `{ subjectReceiptId?, subjectKind (ADMISSION|LOAD_SHED|BULKHEAD|COMPOSITE), honestyClaims: { softObserveFreeze, noLiveMetrics, productionReadyNo, schemasAtCeiling } }`.
3. Soft-observe freeze pinShort `933f32ae` with `tipRewriteRefused`, `l35ReopenRefused`, `l36AutoCloseRefused`, `liveMetricsClaimRefused`, `productionReadyFlipRefused`, `schemasAtCeiling: true`.
4. Policy **DENY** on: missing subjectKind/honestyClaims, secrets, PRODUCTION_READY flip, Fundacion target, hard-delete/mass-prune, tip-rewrite, schema-json add, live-metrics honesty lie, reopen L30–L35, L36 auto-close, GHE claims, auto-seal without human gate.
5. **HOLD** / **PASS** emit `attestationDigest` via `sha256Canonical`; trail chains via `prevReceiptHash`.
6. **PASS** seals hermetic capacity/admission honesty attestation only — **not** live metrics / wall-clock capacity authority / soft-observe-as-capacity-truth.
7. **PASS ≠ live metrics ≠ tip-refresh ≠ PRODUCTION_READY ≠ EJ quota ≠ EK shed ≠ EL isolate ≠ EH temporal**.
8. Node built-ins only (`node:crypto`). No live metrics scrapers. No CloudAgent.

### Non-claims

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L35 | CLOSED — NEVER reopen |
| L36 | OPEN (Audit+EJ+EK+EL MEASURED · EM this · EN pending) |
| Freeze pin | `933f32ae` (soft-observe only; NOT rewritten) |
| Ceiling | schemas AT_CEILING 35/35 |
| PASS | hermetic capacity/admission honesty attestation ≠ live metrics ≠ tip-refresh ≠ PRODUCTION_READY |
| Tip-refresh | NOT this package (SEPARATE next) |
| Soft-observe alone | NOT capacity truth |

## Alternatives Considered AND REJECTED

- Claiming live metrics / wall-clock capacity authority as part of honesty attestation — REJECTED: PASS seals hermetic honesty attestation only.
- Treating soft-observe freeze pins as capacity truth — REJECTED: soft-observe ≠ capacity truth (mirror EH).
- Extending EJ/EK/EL with honesty fields — REJECTED: keep attestation axis distinct.
- Adding `docs/schemas/**/*.json` for attestation contracts — REJECTED: schemas AT_CEILING 35/35.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED: local governed seal only.
- Reopening L30–L35 or auto-closing L36 — REJECTED: L30–L35 NEVER reopen; L36 auto-close refused (EN pending).
- Tip-refresh / tip-seal / freeze `main_tip` rewrite in this PR — REJECTED: tip-refresh post-EM is SEPARATE next.
- CloudAgent path — REJECTED: Antigravity-first, local only.

## Consequences

- Positive: Fourth Ladder 36 satellite attests capacity/admission honesty of EJ/EK/EL receipts without claiming live metrics authority, with hermetic PASS / HOLD / DENY receipts.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI (zero secrets), Law VII (professional English), L30–L35 CLOSED, freeze pin `933f32ae` soft-observed only, schemas AT_CEILING 35/35.
- Follow-ups: Mission EN. Tip-refresh post-EM is SEPARATE.

## Links

- OpenSpec: `openspec/changes/eos-ladder-36-mission-em/`
- Tests: `tests/eos-em-capacity-honesty-attestation.test.js` (EM1–EM17)
- Patcher: `scripts/patch-mission-em.mjs`
- Prior: ADR-0127 (Mission EL), ADR-0126 (Mission EK), ADR-0125 (Mission EJ), ADR-0124 (L36 Audit), ADR-0122 (Mission EH pattern)

# ADR-0069 — Mission CQ Local CI Continuity Port

- **Status:** Accepted — local governed (Ladder 27 Satellite 1)
- **Date:** 2026-09-19
- **Deciders:** EOS local governed use (Sovereign Operator Continuity & Local CI / Evidence Ritual Fabric)
- **Spec:** SPEC-0100

## Context

Post-L26 Workstream C delivered `local-ci-surrogate.js` (ACTIVE under GHA BILLING_BLOCKED) but EOS lacked a Layer-0 continuity **port** with sealed receipts (`CQ-RCPT-*`) that binds mission-pack / dirty / stale / drift / verify matrix honesty under fail-closed policy — without claiming GitHub Actions green, GHE enforcement, or a PRODUCTION_READY flip. Ladder 27 is OPEN (Audit MEASURED · CQ–CU pending) after tip-refresh #376. ADR-0068 remains the L27 maturity-gap audit (do not consume that number here).

## Decision

1. Implement three Layer-0 modules under `src/core/ci/`:
   - `local-ci-continuity-receipt.js`: Nine-field SHA-256 sealed `CQ-RCPT-*` with forced `ci_environment` (BILLING_BLOCKED / ACTIVE / NOT_RUN).
   - `local-ci-continuity-policy-gate.js`: Fail-closed continuity-plan validation.
   - `local-ci-continuity-port.js`: `govern` / `evaluate` / `verifyTrail` / `getDecision`; soft-imports `local-ci-surrogate.js` when present (compose, don't rewrite) else fixture/builtin double.
2. Valid plan + continuityMode:
   - `ACTIVE` + surrogate ok → PASS
   - `HOLD` → HOLD (observe; still BILLING_BLOCKED)
   - Surrogate fail / gate reject → DENY (sealed)
3. Exclude satellite test from slim; opt-in via `npm run test:mission-cq`.
4. PRODUCTION_READY=NO; Fundacion Δ=0; NON-CLAIM GHA green / GHE / PRODUCTION_READY flip / reopen L26 / L27 closeout.
5. Do **not** tip-refresh / implement CR–CU in this mission.

## Alternatives REJECTED

- Claim GitHub Actions green from local surrogate pass — refuse; force NOT_RUN.
- GHE required-check enforcement / Fundacion writes / PRODUCTION_READY=YES / reopen L26 / rewrite surrogate.
- New `docs/schemas/**/*.json` (AT_CEILING 35/35).

## Consequences

- Positive: Sealed Local CI Continuity Port with PASS|DENY|HOLD + chained CQ receipts; compose post-L26 C; ~18 hermetic tests; Fundacion Δ=0.
- Negative: Local governed surface — not remote CI / GHE product.
- Invariants: PRODUCTION_READY=NO; L17–L26 never reopen; port green ≠ L27 closeout.

## NON-CLAIMS

- Local CI Continuity Port ≠ GitHub Actions green / ≠ GHE required-check enforcement
- ≠ Fundacion writes / PRODUCTION_READY=NO / ≠ reopen L26 / ≠ L27 closeout / ≠ CR–CU

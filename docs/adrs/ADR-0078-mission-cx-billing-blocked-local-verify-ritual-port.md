# ADR-0078 — Mission CX Billing-Blocked Local Verify Ritual Port

- **Status:** Accepted — local governed (Ladder 28 Satellite 3)
- **Date:** 2026-09-21
- **Deciders:** EOS local governed use (Sovereign Operator Control-Plane Composition & HUD/Doctor Ritual Fabric)
- **Spec:** SPEC-0107

## Context

CQ Local CI Continuity Port seals billing-blocked local CI receipts, but EOS lacks a Layer-0 **operator runbook / local verify ritual** port (`CX-RCPT-*`) hardening beyond CQ — composing CR/CS/CT + HUD honesty into an operator ritual under BILLING_BLOCKED honesty. CW (SPEC-0106 / #392) delivered Cross-Port Continuity Orchestration Port MEASURED; CV (SPEC-0105 / #390) delivered HUD/Doctor Honesty Ritual MEASURED. Ladder 28 remains OPEN (Audit MEASURED · CV MEASURED · CW MEASURED · CX–CZ pending). Freeze honesty pin stays `97d23ebc` (CW MEASURED); HEAD may be `7e3a9144` (tip-refresh #393) — do not tip-refresh from this package.

## Decision

1. Implement three Layer-0 modules under `src/core/composition/`:
   - `billing-blocked-local-verify-ritual-receipt.js`: Nine-field SHA-256 sealed `CX-RCPT-*` with forced `ciEnvironment` `{ github_actions: BILLING_BLOCKED, local_surrogate: ACTIVE, github_actions_verdict: NOT_RUN }`.
   - `billing-blocked-local-verify-ritual-policy-gate.js`: Fail-closed local verify ritual plan validation (Fundacion Δ=0, Law VI, GHA green / GHE / PRODUCTION_READY flip / L27 reopen / tip rewrite / CQ rewrite / auto-seal refuse; require CQ observe label).
   - `billing-blocked-local-verify-ritual-port.js`: `govern` / `evaluate` / `getDecision` / `verifyTrail`; soft-compose CQ BILLING_BLOCKED observe + optional CR/CS/CT/CV/CW labels/fixtures; soft-import CV/CW honesty when present (compose, don't fork; builtin double otherwise). Do **not** rewrite CQ product.
2. Valid plan + ritualMode:
   - `ACTIVE` + well-formed + CQ observe present + honesty ok → PASS
   - `HOLD` → HOLD (observe; ≠ automatic L28 close / ≠ GHA green)
   - missing CQ without ack / GHA green claim / GHE / Fundacion / secrets / PRODUCTION_READY flip / L27 reopen / tip rewrite / CQ rewrite / weaken ALWAYS_DENY / auto-seal → DENY (sealed)
3. Explicit honesty: local verify PASS ≠ claim GitHub Actions green ≠ GHE required-check enforcement. Forced BILLING_BLOCKED encoding refuses GH green overrides.
4. Soft-compose CQ observe + optional CR/CS/CT/CV/CW as labels only (fixture compose OK; do not require live CQ–CW govern for happy path; do not rewrite CQ).
5. Preserve FUNDACION_ALWAYS_DENY + human PRODUCTION_READY gate — refuse auto; never write Fundacion paths; never tip-rewrite.
6. Exclude satellite test from slim; opt-in via `npm run test:mission-cx`.
7. PRODUCTION_READY=NO; Fundacion Δ=0; NON-CLAIM GHA green / GHE / L27 reopen / tip rewrite / L28 closeout / tip-refresh / CY / CQ rewrite.
8. Do **not** tip-refresh / implement CY in this mission. Freeze pin stays `97d23ebc` until parent tip-refresh post-CX. Do NOT rewrite freeze to `7e3a9144`.

## Alternatives REJECTED

- Auto PRODUCTION_READY flip or tip rewrite from local verify PASS — refuse (A7 + A8).
- Claim GHA green / GHE enforcement from local verify PASS — refuse (explicit BILLING_BLOCKED honesty).
- Rewrite CQ product / reopen L27 / new `docs/schemas/**/*.json` (AT_CEILING 35/35).
- Require live CQ–CW govern for happy path — couples too hard; labels/fixture compose OK.
- Tip-refresh or start CY from this package.

## Consequences

- Positive: Sealed Billing-Blocked Local Verify Ritual Port with PASS|DENY|HOLD + chained CX receipts; compose CQ BILLING_BLOCKED + CR/CS/CT/CV/CW observe; ~17 hermetic tests; Fundacion Δ=0; local PASS ≠ GHA green.
- Negative: Local governed surface — not PRODUCTION_READY flip / not tip rewrite / not L28 closeout / not GHE / not GHA green / not CQ rewrite.
- Invariants: PRODUCTION_READY=NO; L17–L27 never reopen; port green ≠ L28 closeout; local PASS ≠ GHA green; freeze pin stays CW MEASURED tip until parent tip-refresh.

## NON-CLAIMS

- Billing-Blocked Local Verify Ritual Port ≠ GHA green / ≠ GHE required-check enforcement / ≠ CQ rewrite / ≠ L27 reopen / ≠ tip rewrite
- ≠ PRODUCTION_READY / ≠ L28 closeout / ≠ tip-refresh / ≠ CY start / PRODUCTION_READY=NO / Fundacion Δ=0

# ADR-0131 — Mission EO Feature-Flag & Runtime Toggle Governance Port

- **Status:** Accepted — local governed (Ladder 37 / Mission EO)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Configuration, Feature-Flag & Policy-Pack Governance Fabric)
- **Spec:** SPEC-0151
- **Prior ADRs:** ADR-0130 (Ladder 37 Maturity Gap Audit), ADR-0129 (Mission EN L36 Closeout)

## Context

Ladder 37 is **OPEN** (tip-open #504 + tip-refresh #505; freeze soft-observe pin `f333afaf`). Formal L30–L36 remain **CLOSED** — **NEVER reopen**. Mission EJ–EN seal admission/backpressure/bulkhead/capacity honesty/seam-pack receipts; EH seals temporal honesty. Runtime/governance kill-switches (`sentinel-killswitch.js`, FDIR `tripFdirKillSwitch`) are integration/sentinel oriented — **not** a receipted Layer-0 feature-flag governance port. There is **no** Layer-0 feature-flag / runtime-toggle surface under `src/core/composition/`.

This ADR accepts Mission EO as the first L37 satellite: a hermetic Feature-Flag & Runtime Toggle Governance Port that seals `EO-RCPT-*` receipts. Tip-refresh post-EO is **SEPARATE** and must not land in this package.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `feature-flag-runtime-toggle-receipt.js` — sealed `EO-RCPT-*` + freeze soft-observe `f333afaf` + `toggleHold`
   - `feature-flag-runtime-toggle-policy-gate.js` — fail-closed govern preconditions
   - `feature-flag-runtime-toggle-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `FEATURE_FLAG_RUNTIME_TOGGLE_GOVERNANCE`.
3. Toggle requires `flagKey` + `toggleClass` + `desiredState` (`ON|OFF|HOLD`); optional hermetic `observedState`; `authorized` must be `true` for PASS.
4. Fail-closed `DENY` + code `TOGGLE_UNAUTHORIZED` when unauthorized; `INVALID_TOGGLE_CLAIM` when hermetic observedState mismatches desiredState.
5. Fold killswitch concerns into fail-closed toggle governance; refuse killswitch-as-port and FDIR-trip-as-axis.
6. Refuse live remote config SDKs, wall-clock rollout authority, tip-refresh, PRODUCTION_READY flip, L30–L36 reopen, L37 auto-close, schema-json add, Fundacion writes, GHE, secrets, mass prune.
7. Soft-observe freeze pinShort `f333afaf` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests EO1–EO17; patcher `scripts/patch-mission-eo.mjs`; OpenSpec `eos-ladder-37-mission-eo`.

## Alternatives Considered AND REJECTED

- Elevating sentinel-killswitch / FDIR trip as the EO port or L37 axis — REJECTED: fold narrowly into fail-closed toggle governance; do NOT make killswitch the port or reopen FDIR as the axis.
- Live remote config SDKs / Date.now as rollout authority — REJECTED: hermetic injected flag state only.
- Extending EJ admission / EK–EM backpressure with flag fields — REJECTED: distinct axis (config/feature-flag vs admission/backpressure); EH temporal honesty likewise distinct.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-EO is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L36 or auto-closing L37 — REJECTED (EP–ES pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: First L37 satellite seals fail-closed feature-flag / runtime-toggle governance with verifiable `EO-RCPT-*` receipts; EP–ER can compose on this surface.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L36 CLOSED, L37 OPEN (EO first; EP–ES pending), freeze pin `f333afaf` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ killswitch port ≠ FDIR axis ≠ live remote config SDK ≠ wall-clock rollout authority.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_37_AUDIT_2026-09-25.md`
- Prior: ADR-0130 (L37 Audit)
- OpenSpec: `openspec/changes/eos-ladder-37-mission-eo/`

# ADR-0132 — Mission EP Policy-Pack Binding & Evaluation Port

- **Status:** Accepted — local governed (Ladder 37 / Mission EP)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Configuration, Feature-Flag & Policy-Pack Governance Fabric)
- **Spec:** SPEC-0152
- **Prior ADRs:** ADR-0130 (Ladder 37 Maturity Gap Audit), ADR-0129 (Mission EN L36 Closeout)

## Context

Ladder 37 is **OPEN** (tip-open #504 + EO #506 merge soft-observe; freeze soft-observe pin `75131386`). Formal L30–L36 remain **CLOSED** — **NEVER reopen**. Mission EJ–EN seal admission/backpressure/bulkhead/capacity honesty/seam-pack receipts; EH seals temporal honesty. Runtime/governance kill-switches (`sentinel-killswitch.js / EO feature-flag surface`, FDIR trip / DX circuit breaker) are integration/sentinel oriented — **not** a receipted Layer-0 feature-flag governance port. There is **no** Layer-0 policy-pack binding/evaluation surface under `src/core/composition/`.

This ADR accepts Mission EP as the second L37 satellite (after EO): a hermetic Policy-Pack Binding & Evaluation Port that seals `EP-RCPT-*` receipts. Tip-refresh post-EP is **SEPARATE** and must not land in this package.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `policy-pack-binding-receipt.js` — sealed `EP-RCPT-*` + freeze soft-observe `75131386` + `packHold`
   - `policy-pack-binding-policy-gate.js` — fail-closed govern preconditions
   - `policy-pack-binding-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `POLICY_PACK_BINDING_EVALUATION`.
3. Binding requires `packId` + `bindingClass` + `desiredBinding` (`BOUND|UNBOUND|HOLD`); optional hermetic `observedBinding`; `authorized` must be `true` for PASS.
4. Fail-closed `DENY` + code `BINDING_UNAUTHORIZED` when unauthorized; `INVALID_BINDING_CLAIM` when hermetic observedBinding mismatches desiredBinding.
5. Refuse EO-feature-flag-as-pack, EJ-admission-as-axis, and DX-circuit-breaker-as-axis; EP is pack bind+evaluate only.
6. Refuse live remote policy engines, wall-clock authority, tip-refresh, PRODUCTION_READY flip, L30–L36 reopen, L37 auto-close, schema-json add, Fundacion writes, GHE, secrets, mass prune.
7. Soft-observe freeze pinShort `75131386` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests EP1–EP17; patcher `scripts/patch-mission-ep.mjs`; OpenSpec `eos-ladder-37-mission-ep`.

## Alternatives Considered AND REJECTED

- Elevating EO feature-flag / DX circuit breaker / EJ admission as the EP port or L37 axis — REJECTED: EP is pack bind+evaluate only.
- Live remote policy engines / Date.now as authority — REJECTED: hermetic injected pack binding state only.
- Extending EJ admission / EK–EM backpressure with pack-binding fields — REJECTED: distinct axis (config/policy-pack vs admission/backpressure); EH temporal honesty likewise distinct.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-EP is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L36 or auto-closing L37 — REJECTED (EQ–ES pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: First L37 satellite seals fail-closed policy-pack binding/evaluation governance with verifiable `EP-RCPT-*` receipts; EP–ER can compose on this surface.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L36 CLOSED, L37 OPEN (EO first; EQ–ES pending), freeze pin `75131386` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO flag port ≠ FDIR axis ≠ live remote policy engine ≠ wall-clock authority.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_37_AUDIT_2026-09-25.md`
- Prior: ADR-0130 (L37 Audit)
- OpenSpec: `openspec/changes/eos-ladder-37-mission-ep/`

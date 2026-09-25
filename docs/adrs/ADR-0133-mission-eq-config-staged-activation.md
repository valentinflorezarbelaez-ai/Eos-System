# ADR-0133 — Mission EQ Config Change / Staged Activation Governance Port

- **Status:** Accepted — local governed (Ladder 37 / Mission EQ)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Configuration, Feature-Flag & Policy-Pack Governance Fabric)
- **Spec:** SPEC-0153
- **Prior ADRs:** ADR-0130 (Ladder 37 Maturity Gap Audit), ADR-0131 (Mission EO), ADR-0132 (Mission EP)

## Context

Ladder 37 is **OPEN** (EO #506 + EP #508 MEASURED; tip-refresh #509 soft-observe; freeze soft-observe pin `748000c3`). Formal L30–L36 remain **CLOSED** — **NEVER reopen**. Mission EO seals feature-flag/runtime toggle receipts; Mission EP seals policy-pack binding/evaluation receipts. There is **no** Layer-0 staged config/flag activation change-seal surface under `src/core/composition/` that chains to L33–L36 intakes.

This ADR accepts Mission EQ as the third L37 satellite (after EO + EP): a hermetic Config Change / Staged Activation Governance Port that seals `EQ-RCPT-*` receipts. Tip-refresh post-EQ is **SEPARATE** and must not land in this package.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `config-staged-activation-receipt.js` — sealed `EQ-RCPT-*` + freeze soft-observe `748000c3` + `activationHold`
   - `config-staged-activation-policy-gate.js` — fail-closed govern preconditions
   - `config-staged-activation-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `CONFIG_STAGED_ACTIVATION_GOVERNANCE`.
3. Activation requires `configKey` + `activationClass` + `desiredStage` (`STAGED|CANARY|FULL|HOLD|ROLLBACK_HOLD`); optional hermetic `observedActivation`; `authorized` must be `true` for PASS.
4. Fail-closed `DENY` + code `ACTIVATION_UNAUTHORIZED` when unauthorized; `INVALID_ACTIVATION_CLAIM` when hermetic observedActivation mismatches desiredStage.
5. Refuse EO-feature-flag-as-activation, EP-policy-pack-as-activation, and DX-circuit-breaker-as-axis; EQ is staged activation only. Fold emergency-override narrowly into fail-closed staged activation — do **not** reopen FDIR/DX as the axis.
6. Refuse live unsupervised mutation, wall-clock authority, tip-refresh authority, remote config push, tip-refresh, PRODUCTION_READY flip, L30–L36 reopen, L37 auto-close, schema-json add, Fundacion writes, GHE, secrets, mass prune.
7. Soft-observe freeze pinShort `748000c3` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests EQ1–EQ17; patcher `scripts/patch-mission-eq.mjs`; OpenSpec `eos-ladder-37-mission-eq`.

## Alternatives Considered AND REJECTED

- Elevating EO feature-flag / EP policy-pack / DX circuit breaker / EJ admission as the EQ port or L37 axis — REJECTED: EQ is staged activation only.
- Live unsupervised mutation / remote config push / Date.now as authority — REJECTED: hermetic injected stage claim only.
- Extending EO toggle / EP binding with staged-activation fields — REJECTED: distinct axis (staged activation vs toggle vs pack bind+evaluate); EJ/EK/EG/EH likewise distinct.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-EQ is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L36 or auto-closing L37 — REJECTED (ER–ES pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: Third L37 satellite seals fail-closed staged-activation governance with verifiable `EQ-RCPT-*` receipts; ER–ES can compose on this surface.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L36 CLOSED, L37 OPEN (EO+EP MEASURED; EQ this; ER–ES pending), freeze pin `748000c3` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO flag port ≠ EP pack port ≠ FDIR axis ≠ live unsupervised mutation ≠ wall-clock authority ≠ remote config push.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_37_AUDIT_2026-09-25.md`
- Prior: ADR-0130 (L37 Audit), ADR-0131 (EO), ADR-0132 (EP)
- OpenSpec: `openspec/changes/eos-ladder-37-mission-eq/`

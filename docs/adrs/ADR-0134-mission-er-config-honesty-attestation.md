# ADR-0134 — Mission ER Config Honesty & Flag Attestation Port

- **Status:** Accepted — local governed (Ladder 37 / Mission ER)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Configuration, Feature-Flag & Policy-Pack Governance Fabric)
- **Spec:** SPEC-0154
- **Prior ADRs:** ADR-0130 (Ladder 37 Maturity Gap Audit — gap #4), ADR-0131 (Mission EO), ADR-0132 (Mission EP), ADR-0133 (Mission EQ), ADR-0128 (Mission EM), ADR-0122 (Mission EH)

## Context

Ladder 37 is **OPEN** (EO #506 + EP #508 + EQ #510 MEASURED; tip-refresh #511 soft-observe; freeze soft-observe pin `7ee4bd49`). Formal L30–L36 remain **CLOSED** — **NEVER reopen**. ADR-0130 gap #4 called out that flag and policy-pack claims must be attested with verifiable receipts; soft-observe of freeze pins alone is **NOT** a config truth source.

Mission EO seals feature-flag/runtime toggle receipts; Mission EP seals policy-pack binding/evaluation receipts; Mission EQ seals staged-activation receipts; Mission EM seals capacity honesty; Mission EH seals temporal honesty. There is **no** Layer-0 config/flag honesty attestation surface under `src/core/composition/` that chains those claims into verifiable `ER-RCPT-*` receipts without treating soft-observe as config truth.

This ADR accepts Mission ER as the fourth L37 satellite (after EO + EP + EQ): a hermetic Config Honesty & Flag Attestation Port. Tip-refresh post-ER is **SEPARATE** and must not land in this package. ES remains pending.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `config-honesty-attestation-receipt.js` — sealed `ER-RCPT-*` + freeze soft-observe `7ee4bd49` + `attestationHold`
   - `config-honesty-attestation-policy-gate.js` — fail-closed govern preconditions
   - `config-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `CONFIG_HONESTY_FLAG_ATTESTATION`.
3. Attestation requires `subjectKind` (`FEATURE_FLAG|POLICY_PACK|STAGED_ACTIVATION|COMPOSITE`) + `honestyClaims` (`softObserveFreeze`, `noLiveFlagStore`, `productionReadyNo`, `schemasAtCeiling`); optional hermetic `observedClaim`; `authorized` must be `true` for PASS.
4. Fail-closed `DENY` + code `ATTESTATION_UNAUTHORIZED` when unauthorized; `INVALID_ATTESTATION_CLAIM` when hermetic observedClaim is invalid or mismatched.
5. Explicit non-claim: soft-observe freeze pins alone ≠ config truth (mirror EM vs soft-observe for capacity; EH vs soft-observe for temporal).
6. Refuse EO-as-attestation, EP-as-attestation, EQ-as-attestation, EM capacity honesty as config axis, EH temporal honesty as config axis; ER is attestation only — does **not** flip flags or activate config.
7. Refuse live remote flag store, wall-clock authority, tip-refresh authority, live unsupervised mutation, tip-refresh, PRODUCTION_READY flip, L30–L36 reopen, L37 auto-close, schema-json add, Fundacion writes, GHE, secrets, mass prune.
8. Soft-observe freeze pinShort `7ee4bd49` only — do **not** rewrite freeze/matrix/m4 tip.
9. Hermetic tests ER1–ER17; patcher `scripts/patch-mission-er.mjs`; OpenSpec `eos-ladder-37-mission-er`.

## Alternatives Considered AND REJECTED

- Treating soft-observe freeze pins as config truth — REJECTED: ADR-0130 gap #4; soft-observe alone ≠ config truth.
- Elevating EO feature-flag / EP policy-pack / EQ staged activation / EM capacity / EH temporal as the ER port — REJECTED: ER is attestation only.
- Live remote flag store / Date.now as authority / unsupervised mutation — REJECTED: hermetic injected observedClaim only.
- Extending EO toggle / EP binding / EQ activation with honesty fields — REJECTED: distinct axis (attestation vs toggle vs pack vs staged activation).
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-ER is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L36 or auto-closing L37 — REJECTED (ES pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims / ES product in this PR — REJECTED.

## Consequences

- Positive: Fourth L37 satellite seals fail-closed config/flag honesty attestation with verifiable `ER-RCPT-*` receipts; ES can compose on this surface; soft-observe is explicitly non-authoritative for config truth.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L36 CLOSED, L37 OPEN (EO+EP+EQ MEASURED; ER this; ES pending), freeze pin `7ee4bd49` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EO flag toggle ≠ EP pack binding ≠ EQ staged activation ≠ EM capacity ≠ EH temporal ≠ live flag store ≠ wall-clock ≠ unsupervised mutation. Soft-observe alone ≠ config truth.

## Links

- Audit: `docs/releases/EOS_MATURITY_LADDER_37_AUDIT_2026-09-25.md` (ADR-0130 gap #4)
- Prior: ADR-0130 (L37 Audit), ADR-0131 (EO), ADR-0132 (EP), ADR-0133 (EQ), ADR-0128 (EM), ADR-0122 (EH)
- OpenSpec: `openspec/changes/eos-ladder-37-mission-er/`

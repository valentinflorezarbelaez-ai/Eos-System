# ADR-0139 — Mission EV Credential Handle Lifecycle / Rotation Governance Port

- **Status:** Accepted — local governed (Ladder 38 / Mission EV)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Credential-Handle & Secret-Zero Governance Fabric)
- **Spec:** SPEC-0158
- **Prior ADRs:** ADR-0136 (Ladder 38 Maturity Gap Audit), ADR-0137 (Mission ET), ADR-0138 (Mission EU), ADR-0133 (Mission EQ staged activation — semantic mirror only)

## Context

Ladder 38 is **OPEN** (Audit MEASURED · ET MEASURED · EU MEASURED · EV this · EW–EX pending). Soft-observe freeze pin is `0eace5df` (EU #523 / current EXPECTED_TIP after tip-refresh #524). Formal L30–L37 remain **CLOSED** — **NEVER reopen**. Mission ET sealed opaque credential-handle binding receipts (`ET-RCPT-*`); Mission EU sealed secret-zero leak-deny / redaction (`EU-RCPT-*`); Mission EQ sealed config staged activation (`EQ-RCPT-*`). Opaque handles still lack a fail-closed **staged rotate/revoke / lifecycle-seal** surface that chains to L37 EQ staged activation and L33–L36 intakes without unsupervised live secret mutation. Tip-refresh post-EV is **SEPARATE**. Law VI is absolute — never seal secrets; never new plaintext credentials on rotate.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `credential-handle-lifecycle-receipt.js` — sealed `EV-RCPT-*` + freeze soft-observe `0eace5df` + `lifecycleHold` (`secretMaterialRefused` / `secretZeroHeld`)
   - `credential-handle-lifecycle-policy-gate.js` — fail-closed govern preconditions + Law VI secret-field / secret-payload refusal + live-mutation / vault-KMS refusal
   - `credential-handle-lifecycle-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `CREDENTIAL_HANDLE_LIFECYCLE_ROTATION`.
3. Claim requires opaque `handleId` + `desiredStage` (`STAGED_ROTATE|ROTATE|REVOKE|HOLD|ROLLBACK_HOLD`); optional hermetic `observedLifecycle` (same stage set); `authorized` must be `true` for PASS.
4. Digest field: `lifecycleDigest` (sha256 of opaque handleId / handleClass / stage metadata only — never secret bytes).
5. Fail-closed `DENY` + code `LIFECYCLE_UNAUTHORIZED` when unauthorized; `INVALID_LIFECYCLE_CLAIM` when `observedLifecycle` mismatches `desiredStage`; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_SECRET_MATERIAL_FORBIDDEN` under Law VI; `LIVE_SECRET_MUTATION_FORBIDDEN` / `VAULT_KMS_FORBIDDEN`.
6. Refuse live secret mutation, vault/KMS, wall-clock authority, tip-refresh authority, ET/EU/EQ elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L37 reopen, L38 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `0eace5df` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests EV1–EV17; patcher `scripts/patch-mission-ev.mjs`; OpenSpec `eos-ladder-38-mission-ev`.

## Alternatives Considered AND REJECTED

- Elevating ET bind / EU leak-deny / EQ config staged activation as the EV port — REJECTED: EV rotates opaque handles; ET is bind ≠ lifecycle; EU is leak-deny ≠ lifecycle; EQ activates config packs ≠ credential handle lifecycle.
- Live secret mutation / vault/KMS / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedLifecycle only.
- Sealing plaintext secrets / secret-looking fields / new plaintext credentials on rotate into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-EV is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L37 or auto-closing L38 — REJECTED (EW–EX pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: Third L38 satellite seals fail-closed credential-handle lifecycle / rotation governance with verifiable `EV-RCPT-*` receipts; EW–EX can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L37 CLOSED, L38 OPEN (Audit+ET+EU MEASURED; EV this; EW–EX pending), freeze pin `0eace5df` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EU/EQ/AU ≠ live secret mutation ≠ wall-clock authority.

## Links

- Audit: ADR-0136 (gap #3)
- Prior: ADR-0137 (Mission ET), ADR-0138 (Mission EU), ADR-0133 (Mission EQ semantic mirror)
- OpenSpec: `openspec/changes/eos-ladder-38-mission-ev/`

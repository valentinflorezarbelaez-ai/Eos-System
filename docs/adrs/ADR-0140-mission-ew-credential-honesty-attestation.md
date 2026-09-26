# ADR-0140 — Mission EW Credential Honesty & Handle Attestation Port

- **Status:** Accepted — local governed (Ladder 38 / Mission EW)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Credential-Handle & Secret-Zero Governance Fabric)
- **Spec:** SPEC-0159
- **Prior ADRs:** ADR-0136 (Ladder 38 Maturity Gap Audit), ADR-0137 (Mission ET), ADR-0138 (Mission EU), ADR-0139 (Mission EV), ADR-0134 (Mission ER config honesty — semantic mirror only)

## Context

Ladder 38 is **OPEN** (Audit MEASURED · ET MEASURED · EU MEASURED · EV MEASURED · EW this · EX pending). Soft-observe freeze pin is `376378be` (EV #525 merge / current EXPECTED_TIP after tip-refresh #526). Formal L30–L37 remain **CLOSED** — **NEVER reopen**. Mission ET sealed opaque credential-handle binding (`ET-RCPT-*`); Mission EU sealed secret-zero leak-deny (`EU-RCPT-*`); Mission EV sealed handle lifecycle/rotation (`EV-RCPT-*`); Mission ER sealed config/flag honesty (`ER-RCPT-*`). Opaque handles still lack a fail-closed **honesty attestation** surface (binding match, digest consistency, refuse secret material) that mirrors ER for the credential-handle axis without mutating secret stores. Tip-refresh post-EW is **SEPARATE**. Law VI is absolute — never seal secrets; seal opaque handleId + attestationDigest + stage/verdict only.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `credential-honesty-attestation-receipt.js` — sealed `EW-RCPT-*` + freeze soft-observe `376378be` + `attestationHold` (`secretMaterialRefused` / `secretZeroHeld`)
   - `credential-honesty-attestation-policy-gate.js` — fail-closed govern preconditions + Law VI secret-field / secret-payload refusal + live-store / vault-KMS refusal + binding/digest checks
   - `credential-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `CREDENTIAL_HONESTY_HANDLE_ATTESTATION`.
3. Claim requires opaque `handleId` + `subjectKind` (`CREDENTIAL_HANDLE|HANDLE_BINDING|HANDLE_LIFECYCLE|COMPOSITE`) + `honestyClaims` (softObserveFreeze, noLiveSecretStore, productionReadyNo, schemasAtCeiling, secretZeroHeld); optional hermetic `observedClaim`; `bindingMatch` / `digestConsistent` must not be false; `authorized` must be `true` for PASS.
4. Digest field: `attestationDigest` (sha256 of opaque handleId / subjectKind / stage / binding metadata only — never secret bytes).
5. Fail-closed `DENY` + code `ATTESTATION_UNAUTHORIZED` when unauthorized; `BINDING_MISMATCH` / `DIGEST_INCONSISTENT` / `INVALID_ATTESTATION_CLAIM`; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` under Law VI; `LIVE_SECRET_STORE_HONESTY_LIE` / `VAULT_KMS_FORBIDDEN`.
6. Refuse live secret store/mutation, vault/KMS, wall-clock authority, tip-refresh authority, ET/EU/EV/ER/AU elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L37 reopen, L38 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `376378be` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests EW1–EW17; patcher `scripts/patch-mission-ew.mjs`; OpenSpec `eos-ladder-38-mission-ew`.

## Alternatives Considered AND REJECTED

- Elevating ET bind / EU leak-deny / EV lifecycle / ER config honesty as the EW port — REJECTED: EW attests opaque handle honesty; ET is bind ≠ attestation; EU is leak-deny ≠ attestation; EV is lifecycle ≠ attestation; ER is config/flag axis ≠ credential-handle axis.
- Live secret store / vault/KMS / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedClaim only.
- Sealing plaintext secrets / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-EW is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L37 or auto-closing L38 — REJECTED (EX pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.
- Reopening AU `src/core/secrets/*` — REJECTED: fold concepts; do not reopen AU.

## Consequences

- Positive: Fourth L38 satellite seals fail-closed credential-handle honesty attestation with verifiable `EW-RCPT-*` receipts; EX can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L37 CLOSED, L38 OPEN (Audit+ET+EU+EV MEASURED; EW this; EX pending), freeze pin `376378be` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EU/EV/ER/EM/EH/AU ≠ live secret store ≠ wall-clock authority. Soft-observe alone ≠ handle truth.

## Links

- Audit: ADR-0136 (gap #4 honesty attestation)
- Prior: ADR-0137 (ET), ADR-0138 (EU), ADR-0139 (EV), ADR-0134 (ER semantic mirror)
- OpenSpec: `openspec/changes/eos-ladder-38-mission-ew/`

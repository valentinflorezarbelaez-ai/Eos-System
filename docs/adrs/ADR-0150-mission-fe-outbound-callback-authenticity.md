# ADR-0150 — Mission FE Outbound Callback Authenticity / Signature-Sign Governance Port

- **Status:** Accepted — local governed (Ladder 40 / Mission FE)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Outbound Delivery & Callback Authenticity Governance Fabric)
- **Spec:** SPEC-0167
- **Prior ADRs:** ADR-0148 (Ladder 40 Maturity Gap Audit), ADR-0149 (Mission FD Outbound Delivery / Callback Registry), ADR-0144 (Mission EZ Webhook Authenticity Verify — inbound mirror)

## Context

Ladder 40 is **OPEN** (Audit MEASURED · FD MEASURED #551 + tip-refresh #552 soft-observe pin `7b47bf8b`). Formal L30–L39 remain **CLOSED** — **NEVER reopen**. Mission FD sealed outbound delivery/callback **registry/binding** only. Mission EZ (L39) seals inbound webhook authenticity **verify**. There is **no** Layer-0 outbound callback authenticity / signature-**sign** surface under `src/core/composition/`. Mission FE is the **second** L40 satellite — **symmetric to Mission EZ**: EZ verifies inbound; FE signs outbound using opaque L38 `handleId`s only (Law VI). Soft-observe opaque FD `targetId`/`deliveryId` refs. FF quarantine is next — do **not** implement here.

This ADR accepts Mission FE as the hermetic Outbound Callback Authenticity / Signature-Sign Governance Port that seals `FE-RCPT-*` receipts with `authenticityDigest` / `signatureDigest` over opaque handle/target/delivery metadata only. Tip-refresh post-FE is **SEPARATE** and must not land in this package. Law VI is absolute — refuse callbackSecret / hmacKey / webhookSecret / signing key material / raw HMAC output; never seal secrets.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `outbound-callback-authenticity-receipt.js` — sealed `FE-RCPT-*` + freeze soft-observe `7b47bf8b` + `authenticityHold` (`callbackSecretMaterialRefused` / `authenticitySecretZeroHeld`)
   - `outbound-callback-authenticity-policy-gate.js` — fail-closed govern preconditions + Law VI callback/HMAC/signing-key/secret-field refusal
   - `outbound-callback-authenticity-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `OUTBOUND_CALLBACK_AUTHENTICITY_HANDLE_SIGN`.
3. Sign requires opaque `handleId` + `authenticityClass` + `desiredVerdict` (`SIGNED|UNSIGNED|HOLD`); optional hermetic `observedVerdict`; optional opaque FD `targetId`/`deliveryId` soft-observe; `authorized` must be `true` for PASS.
4. Digest field: `authenticityDigest` (alias `signatureDigest`) — sha256 of opaque outbound metadata only — never secret/HMAC raw material.
5. Fail-closed `DENY` + code `SIGN_UNAUTHORIZED` when unauthorized; `INVALID_VERDICT_CLAIM` when hermetic observedVerdict mismatches desiredVerdict; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_CALLBACK_SECRET_MATERIAL_FORBIDDEN` under Law VI.
6. Refuse live signature sign endpoints, wall-clock authority, tip-refresh authority, ET/EZ/FD/AU/FF elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L39 reopen, L40 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `7b47bf8b` (FD merge #551 / tip-refresh #552) only — do **not** rewrite freeze/matrix/m4 tip. Tip-refresh post-FE is SEPARATE.
8. Hermetic tests FE1–FE17; patcher `scripts/patch-mission-fe.mjs`; OpenSpec `eos-ladder-40-mission-fe`.

## Alternatives Considered AND REJECTED

- Elevating FD registry / EZ verify / ET credential-handle / L33 domain-event outbound as the FE sign port — REJECTED: FE is signature-sign via L38 handles; FD is registry only; EZ is inbound verify.
- Live signature sign endpoints / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedVerdict only.
- Sealing callback secrets / HMAC keys / webhook secrets / signing keys / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-FE is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L39 or auto-closing L40 — REJECTED (FF–FH pending).
- Implementing FF quarantine in this package — REJECTED: next satellite.
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: Second L40 satellite seals fail-closed outbound-callback authenticity sign governance with verifiable `FE-RCPT-*` receipts; FF–FH can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L39 CLOSED, L40 OPEN (Audit MEASURED; FD MEASURED; FE this; FF–FH pending), freeze pin `7b47bf8b` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EZ/FD/AU/FF ≠ live signature sign endpoint ≠ wall-clock authority.

## Links

- Audit: ADR-0148 / Ladder 40 Maturity Gap Audit
- Mirror (inbound verify): ADR-0144 / Mission EZ SPEC-0162
- Prior L40 satellite: ADR-0149 / Mission FD SPEC-0166
- OpenSpec: `openspec/changes/eos-ladder-40-mission-fe/`

# ADR-0144 — Mission EZ Webhook Authenticity / Signature-Verify Governance Port

- **Status:** Accepted — local governed (Ladder 39 / Mission EZ)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign External Event Ingress & Webhook Authenticity Governance Fabric)
- **Spec:** SPEC-0162
- **Prior ADRs:** ADR-0142 (Ladder 39 Maturity Gap Audit), ADR-0141 (Mission EX L38 Closeout)

## Context

Ladder 39 is **OPEN** (Audit MEASURED · EY MEASURED · EZ this · FA–FC pending; freeze soft-observe pin `cc9161f9` (EY merge #536 / tip-refresh #537)). Formal L30–L38 remain **CLOSED** — **NEVER reopen**. Ladder 38 sealed credential-handle registry → secret-zero → lifecycle → honesty → seam-pack, but there is **no** Layer-0 webhook authenticity or opaque authenticity verify surface under `src/core/composition/`. L33 domain-event ports are **outbound** — distinct; do **not** reopen. Mission EZ (webhook authenticity / signature-verify) is the **next** satellite — EY is registry/verify only.

This ADR accepts Mission EZ as the second L39 satellite: a hermetic Webhook Authenticity / Signature-Verify Governance Port that seals `EZ-RCPT-*` receipts with `authenticityDigest` over opaque ingress/source metadata only. Tip-refresh post-EY is **SEPARATE** and must not land in this package. Law VI is absolute — refuse webhook secrets, HMAC keys, raw secret-looking payloads; never seal secrets.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `webhook-authenticity-receipt.js` — sealed `EZ-RCPT-*` + freeze soft-observe `cc9161f9` + `authenticityHold` (`webhookSecretMaterialRefused` / `authenticitySecretZeroHeld`)
   - `webhook-authenticity-policy-gate.js` — fail-closed govern preconditions + Law VI webhook/HMAC/secret-field refusal
   - `webhook-authenticity-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `WEBHOOK_AUTHENTICITY_HANDLE_VERIFY`.
3. Verify requires opaque `handleId` + `sourceId` + `authenticityClass` + `desiredVerdict` (`AUTHENTIC|INAUTHENTIC|HOLD`); optional hermetic `observedVerdict`; `authorized` must be `true` for PASS.
4. Digest field: `authenticityDigest` (sha256 of opaque ingress metadata only — never secret/HMAC raw material).
5. Fail-closed `DENY` + code `VERIFY_UNAUTHORIZED` when unauthorized; `INVALID_VERDICT_CLAIM` when hermetic observedVerdict mismatches desiredVerdict; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN` under Law VI.
6. Refuse live signature verify endpoints, wall-clock authority, tip-refresh authority, ET/EY/AU/FA elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L38 reopen, L39 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `cc9161f9` (EY merge #536 / tip-refresh #537) only — do **not** rewrite freeze/matrix/m4 tip. Tip-refresh post-EZ is SEPARATE.
8. Hermetic tests EY1–EY17; patcher `scripts/patch-mission-ez.mjs`; OpenSpec `eos-ladder-39-mission-ez`.

## Alternatives Considered AND REJECTED

- Elevating ET credential-handle / L33 domain-event outbound / EZ webhook authenticity as the EY port — REJECTED: EY is ingress registry bind only; EZ is next.
- Live webhook endpoints / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedVerdict only.
- Sealing webhook secrets / HMAC keys / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-EZ is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L38 or auto-closing L39 — REJECTED (FA–FC pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: First L39 satellite seals fail-closed webhook authenticity verify governance with verifiable `EZ-RCPT-*` receipts; EZ–FB can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L38 CLOSED, L39 OPEN (Audit MEASURED; EY this; FA–FC pending), freeze pin `cc9161f9` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ ET/EY/AU/FA ≠ live signature verify endpoint ≠ wall-clock authority.

## Links

- Audit: ADR-0142 / Ladder 39 Maturity Gap Audit
- OpenSpec: `openspec/changes/eos-ladder-39-mission-ez/`

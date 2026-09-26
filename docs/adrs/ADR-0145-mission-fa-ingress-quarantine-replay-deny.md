# ADR-0145 — Mission FA Ingress Quarantine / Replay-Deny & Ordering Governance Port

- **Status:** Accepted — local governed (Ladder 39 / Mission FA)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign External Event Ingress & Webhook Authenticity Governance Fabric)
- **Spec:** SPEC-0163
- **Prior ADRs:** ADR-0142 (Ladder 39 Maturity Gap Audit), ADR-0143 (Mission EY), ADR-0144 (Mission EZ)

## Context

Ladder 39 is **OPEN** (Audit MEASURED · EY MEASURED · EZ MEASURED · FA this · FB–FC pending; freeze soft-observe pin `3cbb32dc` (EZ merge #538 / tip-refresh #539)). Formal L30–L38 remain **CLOSED** — **NEVER reopen**. EY sealed opaque ingress registry binding; EZ sealed webhook authenticity verify via L38 opaque handles — but there is **no** Layer-0 ingress quarantine / replay-deny / ordering surface under `src/core/composition/`. EB dead-letter quarantine (L34) and L36 admission/backpressure are **distinct** — fold concepts only; do **not** reopen. Mission FA (ingress quarantine / replay-deny) is the **next** satellite — FB honesty is next after FA.

This ADR accepts Mission FA as the third L39 satellite: a hermetic Ingress Quarantine / Replay-Deny & Ordering Governance Port that seals `FA-RCPT-*` receipts with `quarantineDigest` / `replayDenyDigest` over opaque ingress/source metadata only. Tip-refresh post-FA is **SEPARATE** and must not land in this package. Law VI is absolute — refuse webhook secrets, HMAC keys, raw webhook bodies/payloads with secret fields; never seal secrets.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `ingress-quarantine-replay-deny-receipt.js` — sealed `FA-RCPT-*` + freeze soft-observe `3cbb32dc` + `quarantineHold` (`webhookSecretMaterialRefused` / `quarantineSecretZeroHeld`)
   - `ingress-quarantine-replay-deny-policy-gate.js` — fail-closed govern preconditions + Law VI webhook/HMAC/secret/raw-payload refusal
   - `ingress-quarantine-replay-deny-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `INGRESS_QUARANTINE_REPLAY_DENY`.
3. Quarantine requires opaque `ingressId` + `quarantineClass` + `desiredStage` (`QUARANTINE|HOLD|REPLAY_DENY|RELEASE_HOLD|ADMIT`); optional hermetic `observedStage`; optional soft-observe EY `sourceId` / EZ `authenticityRef`; `authorized` must be `true` for PASS.
4. Digest fields: `quarantineDigest` (canonical seal) + attached `replayDenyDigest` (sha256 of opaque ingress metadata only — never secret/raw payload material).
5. Fail-closed `DENY` + code `QUARANTINE_UNAUTHORIZED` when unauthorized; `INVALID_STAGE_CLAIM` when hermetic observedStage mismatches desiredStage; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_WEBHOOK_SECRET_MATERIAL_FORBIDDEN` / `RAW_PAYLOAD_MATERIAL_FORBIDDEN` under Law VI.
6. Refuse live ingress mutation, live webhook ingress endpoints, wall-clock authority, tip-refresh authority, EY/EZ/EB/L36/FB elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L38 reopen, L39 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `3cbb32dc` (EZ merge #538 / tip-refresh #539) only — do **not** rewrite freeze/matrix/m4 tip. Tip-refresh post-FA is SEPARATE.
8. Hermetic tests FA1–FA17; patcher `scripts/patch-mission-fa.mjs`; OpenSpec `eos-ladder-39-mission-fa`.

## Alternatives Considered AND REJECTED

- Elevating EY ingress registry / EZ authenticity / EB dead-letter / L36 admission as the FA port — REJECTED: FA is quarantine/replay-deny only; fold concepts; do not reopen L34/L36.
- Live ingress mutation / live webhook endpoints / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedStage only.
- Sealing webhook secrets / HMAC keys / raw payloads / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-FA is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L38 or auto-closing L39 — REJECTED (FB–FC pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: Third L39 satellite seals fail-closed ingress quarantine / replay-deny governance with verifiable `FA-RCPT-*` receipts; FB–FC can compose on this surface without sealing secrets.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L38 CLOSED, L39 OPEN (Audit MEASURED; EY+EZ MEASURED; FA this; FB–FC pending), freeze pin `3cbb32dc` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/EZ/EB/L36/FB ≠ live ingress mutation ≠ wall-clock authority.

## Links

- Audit: ADR-0142 / Ladder 39 Maturity Gap Audit
- Prior: ADR-0143 (EY), ADR-0144 (EZ)
- OpenSpec: `openspec/changes/eos-ladder-39-mission-fa/`

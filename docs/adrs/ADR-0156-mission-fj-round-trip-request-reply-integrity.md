# ADR-0156 — Mission FJ Round-Trip / Request-Reply Integrity Governance Port

- **Status:** Accepted — local governed (Ladder 41 / Mission FJ)
- **Date:** 2026-10-01 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric)
- **Spec:** SPEC-0172
- **Prior ADRs:** ADR-0154 (Ladder 41 Maturity Gap Audit), ADR-0155 (Mission FI Bidirectional Delivery Correlation Registry)

## Context

Ladder 41 is **OPEN** (tip-open #564 + tip-refresh #565 soft-observe; freeze soft-observe pin `78141c3d`). Mission FI MEASURED (#566) sealed bidirectional-delivery-correlation **registry/binding** only. Formal L30–L40 remain **CLOSED** — **NEVER reopen**. There is **no** Layer-0 round-trip / request-reply integrity verify surface under `src/core/composition/`. Mission FJ is the **second** L41 satellite: fail-closed integrity verify across correlated opaque FI + L39 + L40 refs. FK quarantine is next — do **not** implement here. Tip-refresh post-FI remains SEPARATE and is **not** performed in this package.

This ADR accepts Mission FJ as the hermetic Round-Trip / Request-Reply Integrity Governance Port that seals `FJ-RCPT-*` receipts with `integrityDigest` over opaque correlation/request/reply/ingress/outbound metadata only. Law VI is absolute — refuse request/reply payloads, integrity secrets, secret-looking fields; never seal secrets. Soft-observe FI `correlationId` and L39/L40 opaque ids only — do **not** reopen those ladders or elevate FI as this port.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `round-trip-request-reply-integrity-receipt.js` — sealed `FJ-RCPT-*` + freeze soft-observe `78141c3d` + `integrityHold` (`integritySecretMaterialRefused` / `integritySecretZeroHeld`)
   - `round-trip-request-reply-integrity-policy-gate.js` — fail-closed govern preconditions + Law VI request/reply payload / secret-field refusal
   - `round-trip-request-reply-integrity-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `ROUND_TRIP_REQUEST_REPLY_INTEGRITY_VERIFY`.
3. Round-trip requires opaque `correlationId` + `requestId` + `replyId` + `ingressId` + `sourceId` (L39 soft-observe) + `targetId` + `deliveryId` (L40 soft-observe) + `integrityClass` + `desiredVerdict` (`INTACT|BROKEN|HOLD`); optional hermetic `observedVerdict` / `roundTripId`; `authorized` must be `true` for PASS.
4. Digest field: `integrityDigest` (sha256 of opaque round-trip metadata only — never request/reply payload secret material).
5. Fail-closed `DENY` + code `INTEGRITY_UNAUTHORIZED` when unauthorized; `INVALID_INTEGRITY_CLAIM` when hermetic observedVerdict mismatches desiredVerdict; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_INTEGRITY_SECRET_MATERIAL_FORBIDDEN` under Law VI.
6. Refuse live HTTP egress, wall-clock authority, tip-refresh authority, EY/FD/FI/FK elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L40 reopen, L41 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
7. Soft-observe freeze pinShort `78141c3d` only — do **not** rewrite freeze/matrix/m4 tip. Tip-refresh post-FJ is SEPARATE.
8. Hermetic tests FJ1–FJ17; patcher `scripts/patch-mission-fj.mjs`; OpenSpec `eos-ladder-41-mission-fj`.

## Alternatives Considered AND REJECTED

- Elevating FI registry / EY ingress / FD outbound / FK quarantine as the FJ integrity port — REJECTED: FJ is round-trip integrity verify; FI is registry only; FK is next.
- Live HTTP egress / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedVerdict only.
- Sealing request/reply payloads / integrity secrets / secret-looking fields into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-FJ is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L40 or auto-closing L41 — REJECTED (FK–FM pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: Second L41 satellite seals fail-closed round-trip / request-reply integrity verify governance with verifiable `FJ-RCPT-*` receipts; FK–FL can compose on this surface without sealing secrets or reopening L39/L40.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L40 CLOSED, L41 OPEN (Audit MEASURED; FI MEASURED; FJ this; FK–FM pending), freeze pin `78141c3d` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/FD/FI/FK/Canary ≠ live HTTP egress ≠ wall-clock authority.

## Links

- Audit: ADR-0154 / Ladder 41 Maturity Gap Audit
- Prior L41 satellite: ADR-0155 / Mission FI SPEC-0171
- OpenSpec: `openspec/changes/eos-ladder-41-mission-fj/`

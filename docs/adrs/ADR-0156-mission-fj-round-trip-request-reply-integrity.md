# ADR-0156 — Mission FJ Round-Trip / Request-Reply Integrity Governance Port

- **Status:** Accepted — local governed (Ladder 41 / Mission FJ)
- **Date:** 2026-09-25 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric)
- **Spec:** SPEC-0172
- **Prior ADRs:** ADR-0155 (Mission FI correlation registry), ADR-0154 (Ladder 41 Maturity Gap Audit), ADR-0149 (Mission FD outbound registry), ADR-0143 (Mission EY ingress registry)

## Context

Ladder 41 is **OPEN** (Audit MEASURED · FI MEASURED #566 · tip-refresh post-#566 soft-observe `8903b57`). Formal L30–L40 remain **CLOSED** — **NEVER reopen**. Mission FI sealed the bidirectional correlation registry binding that joins opaque L39 ingress refs ↔ L40 outbound refs, but there is **no** Layer-0 surface that verifies request/reply round-trip integrity across that correlated binding. Mission FJ is the second L41 satellite. Mission FK (mismatch quarantine/deny) is the **next** satellite — FJ is integrity verification only.

This ADR accepts Mission FJ: a hermetic Round-Trip / Request-Reply Integrity Governance Port that seals `FJ-RCPT-*` receipts with `roundTripDigest` over opaque FI correlation + request/reply metadata only. Law VI is absolute — refuse request/reply secrets, raw payloads and secret-looking fields; never seal secrets. Tip-refresh post-FJ is **SEPARATE** and must not land in this package.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `round-trip-request-reply-integrity-receipt.js` — sealed `FJ-RCPT-*` + freeze soft-observe `8903b57` + `roundTripHold` (`roundTripSecretMaterialRefused` / `roundTripSecretZeroHeld`)
   - `round-trip-request-reply-integrity-policy-gate.js` — fail-closed govern preconditions + Law VI request/reply secret-field refusal
   - `round-trip-request-reply-integrity-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `ROUND_TRIP_REQUEST_REPLY_INTEGRITY_VERIFICATION`.
3. Round trip requires opaque `correlationId` + `bindingId` (FI soft-consume) + `requestId` + `replyId` + `requestDigest` + `replyDigest` (64-hex sha256) + `correlationClass` + `integrityClass` + `desiredIntegrity` (`VERIFIED|MISMATCH|HOLD`); optional hermetic `observedIntegrity`; `authorized` must be `true` for PASS.
4. Digest field: `roundTripDigest` (sha256 of opaque FI correlation + request/reply ids, classes and digests only — never secret/raw payload material).
5. Fail-closed `DENY` + code `ROUND_TRIP_UNAUTHORIZED` when unauthorized; `INTEGRITY_MISMATCH` when observedIntegrity mismatches desiredIntegrity or desiredIntegrity is not VERIFIED; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN` under Law VI.
6. Refuse live HTTP request/reply transport, wall-clock authority, tip-refresh authority, FI/FK elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L40 reopen, L41 auto-close, schema-json add, Fundacion writes, GHE, mass prune, network write.
7. Soft-observe freeze pinShort `8903b57` only — do **not** rewrite freeze/matrix/m4 tip.
8. Hermetic tests FJ1–FJ17; OpenSpec `eos-ladder-41-mission-fj`.

## Alternatives Considered AND REJECTED

- Elevating FI correlation registry / FK quarantine / Canary dispatcher as the FJ port — REJECTED: FJ consumes FI binding and verifies integrity only; FK is next.
- Live HTTP request/reply transport / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedIntegrity only.
- Sealing request/reply secrets, HMAC material or raw payloads into receipts — REJECTED: Law VI absolute.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-FJ is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening FI/L30–L40 or auto-closing L41 — REJECTED (FK–FM pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: Second L41 satellite seals fail-closed round-trip / request-reply integrity verification with verifiable `FJ-RCPT-*` receipts; FK–FL can compose on this surface without sealing secrets or reopening FI/L39/L40.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L40 CLOSED, L41 OPEN (Audit MEASURED; FI MEASURED; FJ this; FK–FM pending), freeze pin not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI/FK/Canary ≠ live HTTP egress ≠ wall-clock authority.

## Links

- Prior satellite: ADR-0155 / Mission FI (SPEC-0171)
- Audit: ADR-0154 / Ladder 41 Maturity Gap Audit
- OpenSpec: `openspec/changes/eos-ladder-41-mission-fj/`

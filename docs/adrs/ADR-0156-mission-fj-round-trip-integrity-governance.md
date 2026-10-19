# ADR-0156 — Mission FJ Round-Trip / Request-Reply Integrity Governance Port

- **Status:** Accepted — local governed (Ladder 41 / Mission FJ)
- **Date:** 2026-10-19 (America/Bogota)
- **Deciders:** EOS local governed use (Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric)
- **Spec:** SPEC-0172
- **Prior ADRs:** ADR-0155 (Mission FI Bidirectional Delivery Correlation Registry), ADR-0154 (Ladder 41 Maturity Gap Audit), ADR-0149 (Mission FD Outbound Registry), ADR-0143 (Mission EY Ingress Registry)

## Context

Ladder 41 is **OPEN** (tip-open #564 + tip-refresh #565 soft-observe; freeze soft-observe pin `78141c3d`). Formal L30–L40 remain **CLOSED** — **NEVER reopen**. Mission FI (SPEC-0171 / ADR-0155) sealed the bidirectional delivery correlation registry & binding surface: opaque L39 ingress refs ↔ L40 outbound refs joined into `FI-RCPT-*` receipts. There is still **no** Layer-0 surface that verifies whether a correlated request/reply pair actually completed a round trip with intact digests.

Mission FJ is the second L41 satellite: a hermetic Round-Trip / Request-Reply Integrity Governance Port that composes over FI correlated opaque refs and seals `FJ-RCPT-*` receipts. It verifies request/reply integrity from SHA-256 digests only — never raw payloads, never secrets. Mission FK (bidirectional mismatch quarantine / deny) is the **next** satellite; FJ is integrity governance only.

Law VI is absolute — refuse raw round-trip / request / reply secret material and secret-looking fields. Soft-observe L39/L40 opaque refs only — do **not** reopen those ladders. Tip-refresh post-FJ is **SEPARATE** and must not land in this package.

## Decision

1. Add Layer-0 triad under `src/core/composition/`:
   - `round-trip-integrity-governance-receipt.js` — sealed `FJ-RCPT-*` + freeze soft-observe `78141c3d` + `integrityHold` (`roundTripSecretMaterialRefused` / `roundTripSecretZeroHeld`)
   - `round-trip-integrity-governance-policy-gate.js` — fail-closed govern preconditions + Law VI round-trip/secret-field refusal
   - `round-trip-integrity-governance-port.js` — facade (`govern`, `verifyRoundTrip`, `verifyTrail`)
2. Operation name: `ROUND_TRIP_REQUEST_REPLY_INTEGRITY_GOVERNANCE`.
3. Round trip requires opaque `correlationId` (FI correlated ref) + `roundTripId` + distinct `requestRef` / `replyRef` + `requestDigest` / `echoedRequestDigest` / `replyDigest` (sha256 hex) + `roundTripClass` + `desiredIntegrity` (`MATCH|MISMATCH|HOLD`); optional hermetic `observedIntegrity`; `authorized` must be `true` for PASS.
4. Digest field: `roundTripDigest` (sha256 of opaque refs + sha256 digests only — never secret/raw payload material).
5. Integrity rule: `MATCH` requires `requestDigest === echoedRequestDigest`; otherwise fail-closed `DENY` + `ROUND_TRIP_DIGEST_MISMATCH`. `MISMATCH` requested in ACTIVE mode is refused with `ROUND_TRIP_MISMATCH_REFUSED` (quarantine is FK, next).
6. Fail-closed `DENY` + code `ROUND_TRIP_UNAUTHORIZED` when unauthorized; `INVALID_ROUND_TRIP_CLAIM` when hermetic observedIntegrity mismatches desiredIntegrity; `SECRET_FIELD_FORBIDDEN` / `SECRET_LEAK_FORBIDDEN` / `RAW_ROUND_TRIP_SECRET_MATERIAL_FORBIDDEN` under Law VI.
7. Refuse live HTTP egress, wall-clock authority, tip-refresh authority, FI/FK/EY/FD/Canary elevate-as-port, tip-refresh, PRODUCTION_READY flip, L30–L40 reopen, L41 auto-close, schema-json add, Fundacion writes, GHE, mass prune.
8. Soft-observe freeze pinShort `78141c3d` only — do **not** rewrite freeze/matrix/m4 tip.
9. Hermetic tests FJ1–FJ20; OpenSpec `eos-ladder-41-mission-fj`.

## Alternatives Considered AND REJECTED

- Elevating FI registry / FK quarantine / EY ingress / FD outbound / Canary dispatcher as the FJ port — REJECTED: FJ composes over FI refs and is integrity governance only; FK is next.
- Live HTTP egress / Date.now as authority / tip-refresh as authority — REJECTED: hermetic injected observedIntegrity + submitted sha256 digests only.
- Sealing raw request/reply payloads, round-trip secrets, or secret-looking fields into receipts — REJECTED: Law VI absolute.
- Treating `MISMATCH` as a PASS in ACTIVE mode — REJECTED: fail-closed DENY; quarantine/deny on mismatch belongs to Mission FK.
- Tip-refresh / tip-seal / freeze tip rewrite in this PR — REJECTED: tip-refresh post-FJ is SEPARATE.
- Flipping `PRODUCTION_READY` to `YES` — REJECTED.
- Reopening L30–L40 or auto-closing L41 — REJECTED (FK–FM pending).
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.
- Fundacion writes / CloudAgent / GHE claims — REJECTED.

## Consequences

- Positive: Second L41 satellite seals fail-closed request/reply round-trip integrity governance with verifiable `FJ-RCPT-*` receipts; FK–FM can compose on this surface without sealing secrets or reopening L39/L40.
- Invariants Preserved: `PRODUCTION_READY=NO`, `Fundacion Δ=0`, Law VI, Law VII, L30–L40 CLOSED, L41 OPEN (Audit MEASURED; FI + FJ measured; FK–FM pending), freeze pin `78141c3d` not rewritten, schemas AT_CEILING 35/35.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI/FK/EY/FD/Canary ≠ live HTTP egress ≠ wall-clock authority. FJ ≠ L41 closeout ≠ FK quarantine.

## Links

- Audit: ADR-0154 / Ladder 41 Maturity Gap Audit
- Prior satellite: ADR-0155 / Mission FI SPEC-0171
- OpenSpec: `openspec/changes/eos-ladder-41-mission-fj/`
- Mirror: Mission EY SPEC-0161 / ADR-0143 (ingress); Mission FD SPEC-0166 / ADR-0149 (outbound)


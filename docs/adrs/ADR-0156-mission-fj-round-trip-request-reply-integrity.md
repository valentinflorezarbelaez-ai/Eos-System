# ADR-0156 — Mission FJ Round-Trip / Request-Reply Integrity Governance Port

- **Status:** Accepted — local governed (Ladder 41 / Mission FJ)
- **Date:** 2026-10-01
- **Deciders:** EOS local governed use (Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric)
- **Spec:** SPEC-0172
- **Prior ADRs:** ADR-0155 (Mission FI Correlation Registry), ADR-0154 (Ladder 41 Maturity Gap Audit)

## Context

Ladder 41 is **OPEN**. Mission FI seals opaque correlation bindings between L39 ingress refs and L40 outbound refs. Nothing yet fail-closes a hermetic request/reply pair against that binding. Formal L30–L40 remain **CLOSED**. FK quarantine is the next satellite.

## Decision

1. Add a Layer-0 triad under `src/core/composition/`:
   - `round-trip-request-reply-integrity-receipt.js` — sealed `FJ-RCPT-*` + freeze soft-observe `78141c3d` + `integrityDigest`
   - `round-trip-request-reply-integrity-policy-gate.js` — fail-closed integrity verify; **reuse** FI governance detectors
   - `round-trip-request-reply-integrity-port.js` — facade (`govern`, `verifyTrail`)
2. Operation name: `ROUND_TRIP_REQUEST_REPLY_INTEGRITY_VERIFY`.
3. PASS requires `authorized === true`, `desiredIntegrity === observedIntegrity === INTACT`, distinct `requestRef` / `replyRef`, a `correlationDigest` that matches recomputed opaque metadata, and a verified Mission FI receipt with `decision === PASS` and the same `correlationDigest`.
4. DENY `INTEGRITY_MISMATCH`, `INTEGRITY_NOT_INTACT`, `CORRELATION_DIGEST_MISMATCH`, `FI_RECEIPT_INVALID`, `FI_RECEIPT_NOT_PASS`, `FI_CORRELATION_MISMATCH`, and `INTEGRITY_UNAUTHORIZED` as specified.
5. Refuse live HTTP egress, wall-clock authority, tip-refresh authority, FI-as-round-trip, FK-as-integrity, EY/FD elevation, tip rewrite, `PRODUCTION_READY` flip, L30–L40 reopen, L41 auto-close, schema-json add, Fundacion writes, and secret material.
6. Soft-observe freeze pinShort `78141c3d` only — do **not** rewrite freeze/matrix/m4 tip. Tip-refresh post-FJ is SEPARATE.
7. Hermetic tests FJ1–FJ13. OpenSpec `eos-ladder-41-mission-fj`.

## Alternatives Considered AND REJECTED

- Cloning the FI policy gate verbatim — REJECTED. FJ calls the exported FI detectors.
- Treating a `BROKEN`/`BROKEN` observation as PASS — REJECTED. PASS seals INTACT pairs only.
- Elevating the FI registry as the round-trip port — REJECTED. FJ consumes a verified FI receipt.
- Implementing FK quarantine in this package — REJECTED. FK is next.
- Tip-refresh, tip-seal, or `PRODUCTION_READY=YES` — REJECTED.
- Adding `docs/schemas/**/*.json` — REJECTED: schemas AT_CEILING 35/35.

## Consequences

- Positive: A request/reply pair can be checked, fail-closed, against a sealed FI correlation without sealing secrets or reopening L39/L40.
- Invariants preserved: `PRODUCTION_READY=NO`, Fundacion Δ=0, Law VI, L30–L40 CLOSED, L41 OPEN (FK–FM pending), freeze pin `78141c3d` not rewritten.
- Non-claims: PASS ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI/FK/EY/FD/Canary ≠ live HTTP egress.

## Links

- OpenSpec: `openspec/changes/eos-ladder-41-mission-fj/`
- Prior: ADR-0155 / Mission FI

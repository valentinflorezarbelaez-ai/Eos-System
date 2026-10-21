# Proposal — Mission FJ Round-Trip / Request-Reply Integrity Governance Port (SPEC-0172)

## Why

After L41 OPEN + Audit MEASURED (ADR-0154) + FI MEASURED (#566 / ADR-0155) + tip-refresh post-#566 (`8903b57`), Ladder 41 needs its second satellite: a Layer-0 port that seals opaque round-trip / request-reply integrity verification into `FJ-RCPT-*` receipts — consuming the opaque FI correlation binding (correlationId/bindingId + L39 ingress refs + L40 outbound refs) and verifying request/reply digest integrity without live HTTP egress, wall-clock authority, tip-refresh authority, sealing request/reply payload secrets, flipping PRODUCTION_READY, rewriting tip pins, reopening FI/L30–L40, auto-closing L41, or network writes. FI correlation registry is the prior satellite (distinct — consumes its binding only). FK mismatch quarantine is the next satellite.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `round-trip-request-reply-integrity-receipt.js` — sealed `FJ-RCPT-*` + freeze soft-observe `8903b57` + `roundTripHold` (`roundTripSecretMaterialRefused` / `roundTripSecretZeroHeld`)
  - `round-trip-request-reply-integrity-policy-gate.js` — fail-closed govern preconditions + Law VI request/reply secret-field refusal
  - `round-trip-request-reply-integrity-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-fj-round-trip-request-reply-integrity.test.js` (FJ1–FJ17)
- OpenSpec change `eos-ladder-41-mission-fj`, ADR-0156

## Non-goals

- Live HTTP request/reply transport / wall-clock / tip-refresh authority; sealing request/reply secrets or raw payloads; FI/FK/Canary elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L41 auto-close; L30–L40 reopen; FI reopen; tip-refresh; CloudAgent; mass prune; FK–FM product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L40 | CLOSED — NEVER reopen |
| L41 | OPEN (Audit MEASURED · FI MEASURED · FJ this · FK–FM pending) |
| Axis | Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric |
| Freeze pin | `8903b57` (tip-refresh post-#566; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal request/reply secrets or raw payloads; opaque ids + classes + sha256 digests only |
| PASS | sealed round-trip integrity verification ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI/FK/Canary |
| Tip-refresh | NOT this package (SEPARATE next after merge) |

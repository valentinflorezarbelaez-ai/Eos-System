# Proposal — Mission FJ Round-Trip / Request-Reply Integrity (SPEC-0172)

## Why

Mission FI seals opaque L39 ingress ↔ L40 outbound correlation bindings (`FI-RCPT-*`). Ladder 41 still has no fail-closed check that a hermetic request/reply pair is intact against that correlation. Mission FJ is that check. It composes on a verified FI PASS receipt and seals `FJ-RCPT-*`. It does not replace FI, reopen L30–L40, flip `PRODUCTION_READY`, or rewrite tip pins.

## What changes

- Layer-0 modules under `src/core/composition/`:
  - `round-trip-request-reply-integrity-receipt.js` — sealed `FJ-RCPT-*`, freeze soft-observe `78141c3d`, `integrityDigest`
  - `round-trip-request-reply-integrity-policy-gate.js` — fail-closed integrity preconditions; reuses FI governance detectors
  - `round-trip-request-reply-integrity-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-fj-round-trip-request-reply-integrity.test.js` (FJ1–FJ13)
- CRLF-safe patcher `scripts/patch-mission-fj.mjs`
- OpenSpec change, ADR-0156

## Non-goals

- Live HTTP egress, wall-clock authority, tip-refresh authority
- Sealing correlation secrets or raw payloads
- Elevating FI, EY, FD, FK, or Canary as this port
- New schema JSON, `PRODUCTION_READY` flip, tip-pin rewrite, Fundacion writes
- L41 auto-close, L30–L40 reopen, FK–FM product, tip-refresh

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L40 | CLOSED — NEVER reopen |
| L41 | OPEN (Audit MEASURED · FI sealed · FJ this · FK–FM pending) |
| Freeze pin | `78141c3d` (soft-observe only; not rewritten) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — opaque refs and digests only |
| PASS | sealed round-trip integrity ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI/FK |
| Tip-refresh | NOT this package (SEPARATE next) |

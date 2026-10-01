# Proposal — Mission FJ Round-Trip / Request-Reply Integrity (SPEC-0172)

## Why

After L41 OPEN + Audit MEASURED (ADR-0154) + FI MEASURED (#566) + freeze soft-observe `78141c3d` (tip-refresh post-#564; tip-refresh post-FI is SEPARATE), Ladder 41 needs its second satellite: a Layer-0 port that seals opaque round-trip / request-reply integrity verify governance into `FJ-RCPT-*` receipts — verifying correlated opaque FI + L39 + L40 refs without live HTTP egress, wall-clock authority, tip-refresh authority, sealing request/reply payloads or integrity secrets, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L40, auto-closing L41, or network writes. FI is registry/binding only (soft-observe `correlationId`). FK quarantine is the next satellite.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `round-trip-request-reply-integrity-receipt.js` — sealed `FJ-RCPT-*` + freeze soft-observe `78141c3d` + integrityHold (`integritySecretMaterialRefused` / `integritySecretZeroHeld`)
  - `round-trip-request-reply-integrity-policy-gate.js` — fail-closed govern preconditions + Law VI request/reply payload / secret-field refusal
  - `round-trip-request-reply-integrity-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-fj-round-trip-request-reply-integrity.test.js` (FJ1–FJ17)
- CRLF-safe surgical patcher `scripts/patch-mission-fj.mjs`
- OpenSpec change, ADR-0156

## Non-goals

- Live HTTP egress / wall-clock / tip-refresh authority; sealing request/reply payloads or integrity secrets; FI/EY/FD/FK elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L41 auto-close; L30–L40 reopen; tip-refresh; CloudAgent; mass prune; FK–FM product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L40 | CLOSED — NEVER reopen |
| L41 | OPEN (Audit MEASURED · FI MEASURED · FJ this · FK–FM pending) |
| Axis | Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric |
| Freeze pin | `78141c3d` (tip-open #564 / tip-refresh #565; soft-observe only — do NOT rewrite; tip-refresh post-FI/FJ is SEPARATE) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal request/reply payloads or integrity secrets; opaque correlation + request/reply + L39/L40 refs + digests only |
| PASS | sealed round-trip request-reply integrity verify ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/FD/FI/FK |
| Tip-refresh | NOT this package (SEPARATE next) |

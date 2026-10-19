# Proposal — Mission FJ Round-Trip / Request-Reply Integrity Governance (SPEC-0172)

## Why

After L41 OPEN + Audit MEASURED (ADR-0154) + tip-refresh #565 soft-observe (`78141c3d`) + Mission FI correlation registry/binding (SPEC-0171 / ADR-0155), Ladder 41 needs its second satellite: a Layer-0 port that verifies request/reply round-trip integrity across FI correlated opaque refs and seals `FJ-RCPT-*` receipts — without live HTTP egress, wall-clock authority, raw payloads, secrets, tip-refresh authority, sealing correlation secrets, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L40, auto-closing L41, or network writes.

FI is registry/binding only. FK mismatch quarantine is the next satellite — FJ must not implement quarantine/deny-on-mismatch beyond fail-closed DENY.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `round-trip-integrity-governance-receipt.js` — sealed `FJ-RCPT-*` + freeze soft-observe `78141c3d` + `integrityHold` (`roundTripSecretMaterialRefused` / `roundTripSecretZeroHeld`)
  - `round-trip-integrity-governance-policy-gate.js` — fail-closed govern preconditions + Law VI round-trip/secret-field refusal
  - `round-trip-integrity-governance-port.js` — facade (`govern`, `verifyRoundTrip`, `verifyTrail`)
- Hermetic tests `tests/eos-fj-round-trip-integrity-governance.test.js` (FJ1–FJ20)
- `package.json` scripts `test:mission-fj`, `test:round-trip-integrity`, `test:ladder41-pack`
- OpenSpec change, ADR-0156

## Non-goals

- Live HTTP egress / wall-clock / tip-refresh authority; sealing raw request/reply payloads or secrets; FI/FK/EY/FD/Canary elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L41 auto-close; L30–L40 reopen; tip-refresh; CloudAgent; mass prune; FK–FM product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L40 | CLOSED — NEVER reopen |
| L41 | OPEN (Audit MEASURED · FI + FJ this · FK–FM pending) |
| Axis | Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric |
| Freeze pin | `78141c3d` (tip-open #564 / tip-refresh #565; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal round-trip secrets / raw request or reply payloads; opaque refs + sha256 digests only |
| PASS | sealed round-trip integrity verification ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI registry replacement ≠ FK quarantine |
| Tip-refresh | NOT this package (SEPARATE next) |

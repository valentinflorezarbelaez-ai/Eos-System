# Proposal — Mission FI Bidirectional Delivery Correlation Registry & Binding (SPEC-0171)

## Why

After L41 OPEN + Audit MEASURED (ADR-0154) + tip-refresh #565 soft-observe (`78141c3d`), Ladder 41 needs its first satellite: a Layer-0 port that seals opaque bidirectional-delivery-correlation registry binding governance into `FI-RCPT-*` receipts — joining soft-observed L39 ingress refs ↔ L40 outbound refs without live HTTP egress, wall-clock authority, tip-refresh authority, sealing correlation secrets/raw payloads, flipping PRODUCTION_READY, rewriting tip pins, reopening L30–L40, auto-closing L41, or network writes. EY ingress registry is L39 inbound (distinct — soft-observe only). FD outbound registry is L40 (distinct — soft-observe only). FJ round-trip integrity is the next satellite.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `bidirectional-delivery-correlation-registry-receipt.js` — sealed `FI-RCPT-*` + freeze soft-observe `78141c3d` + correlationHold (`correlationSecretMaterialRefused` / `correlationSecretZeroHeld`)
  - `bidirectional-delivery-correlation-registry-policy-gate.js` — fail-closed govern preconditions + Law VI correlation/secret-field refusal
  - `bidirectional-delivery-correlation-registry-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-fi-bidirectional-delivery-correlation-registry.test.js` (FI1–FI17)
- CRLF-safe surgical patcher `scripts/patch-mission-fi.mjs`
- OpenSpec change, ADR-0155

## Non-goals

- Live HTTP egress / wall-clock / tip-refresh authority; sealing correlation secrets/raw payloads; EY/FD/FJ elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L41 auto-close; L30–L40 reopen; tip-refresh; CloudAgent; mass prune; FJ–FM product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L40 | CLOSED — NEVER reopen |
| L41 | OPEN (Audit MEASURED · FI this · FJ–FM pending) |
| Axis | Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric |
| Freeze pin | `78141c3d` (tip-open #564 / tip-refresh #565; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — never seal correlation secrets / raw payloads; opaque correlation + L39/L40 refs + digests only |
| PASS | sealed bidirectional-delivery-correlation binding ≠ tip-refresh ≠ PRODUCTION_READY ≠ EY/FD/FJ |
| Tip-refresh | NOT this package (SEPARATE next) |

# Proposal — Mission FL Bidirectional Delivery Honesty & Integrity Attestation Port (SPEC-0174)

**Status:** READY · authorized · post-#578 merge (`e1a17e9b`) + tip-refresh post-#578 (`a5836fd4`).

## Why

After L41 OPEN + Audit MEASURED (ADR-0154) + FI MEASURED (#566 / ADR-0155) + FJ MEASURED (#577 / ADR-0156) + FK MEASURED (#578 / ADR-0157), Ladder 41 needs its fourth satellite: a Layer-0 port that **attests** the honesty and integrity of bidirectional delivery claims beyond soft-observe — consuming the opaque FI correlation binding, the FJ round-trip verdict and the FK quarantine/deny decision, without live HTTP egress, wall-clock authority, tip-refresh authority, sealing secrets/payloads, flipping PRODUCTION_READY, rewriting tip pins, reopening FI/FJ/FK/L30–L40, or auto-closing L41. FM (seam-pack closeout) is the last satellite; FL attests only.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `bidirectional-delivery-honesty-attestation-receipt.js` — sealed `FL-RCPT-*` + freeze soft-observe `e1a17e9b` + `attestationHold` (`attestationSecretMaterialRefused` / `attestationSecretZeroHeld`)
  - `bidirectional-delivery-honesty-attestation-policy-gate.js` — fail-closed attestation preconditions + Law VI attestation/secret-field refusal
  - `bidirectional-delivery-honesty-attestation-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-fl-bidirectional-delivery-honesty-attestation.test.js` (FL1–FL17)
- OpenSpec change `eos-ladder-41-mission-fl`, ADR-0158
- `package.json` + `scripts/test-runner.js` wiring (slim-excluded to hold TR-01 ≤ 145)

## Non-goals

- Live HTTP egress / wall-clock / tip-refresh authority; sealing request/reply/attestation secrets or payloads; FI/FJ/FK elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L41 auto-close; L30–L40 reopen; FI/FJ/FK reopen; tip-refresh; CloudAgent; mass prune; FM product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L40 | CLOSED — NEVER reopen |
| L41 | OPEN (Audit MEASURED · FI MEASURED · FJ MEASURED · FK MEASURED (#578) · FL this satellite · FM pending) |
| Axis | Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric |
| Freeze pin | `e1a17e9b` (post-#578 merge; soft-observe only) |
| Observed main tip at authoring | `a5836fd4` (tip-refresh post-#578 merge — pin catch-up is a SEPARATE act) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — opaque refs + claim verdicts + sha256 digests only; never seal or copy payload bytes |
| PASS | sealed attestation ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI/FJ/FK/FM/Canary |
| Authorization | PO authorized 2026-10-22 (post-#578 merge) for FL runtime implementation |

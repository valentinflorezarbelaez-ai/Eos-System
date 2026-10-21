# Proposal — Mission FK Bidirectional Mismatch Quarantine / Deny Governance Port (SPEC-0173)

**Status:** READY · authorized · post-#577 merge (`038a9a4`) + tip-refresh post-FJ.

## Why

After L41 OPEN + Audit MEASURED (ADR-0154) + FI MEASURED (#566 / ADR-0155) + FJ MEASURED (#577 / ADR-0156), Ladder 41 needs its third satellite: a Layer-0 port that turns a detected bidirectional mismatch into a fail-closed quarantine/deny decision — consuming the opaque FI correlation binding and the FJ round-trip verdict, without live HTTP egress, wall-clock authority, tip-refresh authority, sealing secrets/payloads, flipping PRODUCTION_READY, rewriting tip pins, reopening FI/FJ/L30–L40, auto-closing L41, or network writes. FL (bidirectional honesty attestation) is the next satellite; FK is quarantine/deny only.

## What changes

- New Layer-0 modules under `src/core/composition/`:
  - `bidirectional-mismatch-quarantine-deny-receipt.js` — sealed `FK-RCPT-*` + freeze soft-observe `<post-FJ tip>` + `quarantineHold` (`mismatchSecretMaterialRefused` / `mismatchSecretZeroHeld`)
  - `bidirectional-mismatch-quarantine-deny-policy-gate.js` — fail-closed quarantine/deny preconditions + Law VI mismatch/secret-field refusal
  - `bidirectional-mismatch-quarantine-deny-port.js` — facade (`govern`, `verifyTrail`)
- Hermetic tests `tests/eos-fk-bidirectional-mismatch-quarantine-deny.test.js` (FK1–FK17)
- OpenSpec change `eos-ladder-41-mission-fk`, ADR-0157

## Non-goals

- Live HTTP egress / wall-clock / tip-refresh authority; sealing request/reply secrets or payloads; FI/FJ/FL elevate-as-port; new schema JSON; PRODUCTION_READY flip; tip-pin rewrite; Fundacion writes; GHE; L41 auto-close; L30–L40 reopen; FI/FJ reopen; tip-refresh; CloudAgent; mass prune; FL–FM product

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L30–L40 | CLOSED — NEVER reopen |
| L41 | OPEN (Audit MEASURED · FI MEASURED · FJ MEASURED (#577) · FK this satellite · FL–FM pending) |
| Axis | Sovereign Bidirectional Delivery Integrity & Correlation Governance Fabric |
| Freeze pin | `038a9a4` (post-#577 merge; soft-observe only) |
| Ceiling | schemas AT_CEILING 35/35 |
| Law VI | held — opaque refs + verdicts + sha256 digests only; never quarantine raw payloads or secrets |
| PASS | fail-closed mismatch quarantine/deny ≠ tip-refresh ≠ PRODUCTION_READY ≠ FI/FJ/FL/Canary |
| Authorization | PO authorized 2026-09-25 (post-#577 merge) for FK runtime implementation |

# Tasks — Mission FM

**Do not tip-seal. Formal L41 CLOSED is a SEPARATE governed act after FM merge + tip-refresh.**

## Step 0: Unblock gate (mandatory)

- [x] FL merged into `main` @ `f5948926` (FL MEASURED via #581)
- [x] Tip-refresh post-#581 sealed (#582 merge @ `fa153c33`); SSOT `main_tip` = `f5948926`
- [x] PO authorization recorded 2026-10-22 to open the FM specification
- [x] L41 OPEN (FI+FJ+FK+FL MEASURED · FM this satellite); L30–L40 CLOSED

## Step 1: Specification (this package — docs-first)

- [x] `freeze_soft_observe: f5948926` filled (symmetry with FL `e1a17e9b` = SSOT main_tip)
- [x] `observed_tip_at_authoring: fa153c33` documented
- [x] Proposal / design / spec delta written; NON-CLAIMs kept
- [x] ADR-0159 drafted
- [x] PO review of the spec delta + ADR-0159 (APPROVED 2026-10-22)

## Step 2: Runtime (after spec review)

- [x] Receipt `ladder41-seam-receipt.js` (`FM-RCPT-*`, `seamDigest`, Law VI)
- [x] Policy gate `ladder41-seam-policy-gate.js` (tip-seal-in-product refuse + L41 auto-close without human gate + L30–L40 gates)
- [x] Port `ladder41-seam-port.js` (`Ladder41SeamPort.seam`, `verifyTrail`, `softObserveFi/Fj/Fk/Fl`)
- [x] Hermetic suite FM1–FM17; `npm run test:mission-fm`; slim-exclude to hold TR-01 ≤ 145
- [x] Wiring: `test:ladder41-seam`, `test:mission-fm`, `test:ladder41-pack`
- [x] Host apply + `verify:strict` + full `npm test` (913/0 · FM 17/17)
- [x] PR + merge (#584 `a4f9709a`); tip-refresh post-FM is SEPARATE
- [x] Tip-refresh post-#584 (`a4f9709a`) — pin catch-up only; L41 OPEN with all satellites MEASURED; tip-seal pending

## Step 3: SEPARATE (not this package)

- [x] Tip-seal Formal Ladder 41 CLOSED (`CLOSED_FOR_LOCAL_GOVERNED_USE`) — landed as tip-seal-l41 (never in the FM product package)

## Envelope

ZERO schema JSON, ZERO freeze/matrix edits, ZERO tip-seal in this package. NO `scripts/patch-mission-fm.mjs` (patcher pattern abandoned after FI).

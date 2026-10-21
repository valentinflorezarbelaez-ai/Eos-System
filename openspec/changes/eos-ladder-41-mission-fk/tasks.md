# Tasks — Mission FK

**Do not execute runtime tasks until PR #577 is merged and tip-refresh post-FJ is sealed.**

## Step 0: Unblock gate (mandatory)

- [x] PR #577 merged into `main` @ `038a9a4` (FJ MEASURED)
- [x] Tip-refresh post-#577 sealed; freeze pin `038a9a4`
- [x] PO authorization recorded 2026-09-25 (post-#577 merge)
- [x] L41 OPEN (FI+FJ MEASURED · FK this · FL–FM pending); L30–L40 CLOSED

## Step 1: Specification finalization

- [x] `freeze_soft_observe: 038a9a4` filled
- [x] Proposal/design updated to READY; NON-CLAIMs kept
- [x] ADR-0157 status Accepted (PO authorized)

## Step 2: Implementation (after Step 0)

- [x] Receipt module `bidirectional-mismatch-quarantine-deny-receipt.js` (`FK-RCPT-*`, `mismatchDigest`, Law VI)
- [x] Policy gate `bidirectional-mismatch-quarantine-deny-policy-gate.js` (mismatch secret-field refuse + FI/FJ/FL elevate refuse + L30–L40 / L41 gates)
- [x] Port `bidirectional-mismatch-quarantine-deny-port.js` (`govern`, `verifyTrail`)
- [x] Hermetic tests FK1–FK17 (17/17 pass); `npm run test:mission-fk`; slim-exclude to hold TR-01 ≤ 145
- [x] Host apply + `verify:strict` + full `npm test` (913/0; 1454/0)
- [ ] PR + merge; tip-refresh post-FK is SEPARATE

## Envelope

Runtime authorized. ZERO schema JSON, ZERO freeze/matrix edits in this package; tip-refresh post-FK is SEPARATE.

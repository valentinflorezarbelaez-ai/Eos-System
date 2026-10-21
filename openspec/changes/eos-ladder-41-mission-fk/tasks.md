# Tasks — Mission FK (DRAFT / BLOCKED)

**Do not execute runtime tasks until PR #577 is merged and tip-refresh post-FJ is sealed.**

## Step 0: Unblock gate (mandatory)

- [ ] Confirm PR #577 merged into `main` (FJ MEASURED)
- [ ] Execute tip-refresh post-FJ; record new freeze pin
- [ ] Obtain explicit PO authorization for runtime FK (docs-only draft ≠ authorization)
- [ ] Confirm L41 still OPEN and FK–FM pending; L30–L40 still CLOSED

## Step 1: Specification finalization

- [ ] Fill `freeze_soft_observe` in `.openspec.yaml` with the post-FJ pin
- [ ] Update proposal/design from DRAFT to ready; keep NON-CLAIMs
- [ ] ADR-0157 status Proposed → Accepted only after PO authorization

## Step 2: Implementation (after Step 0)

- [ ] Receipt module `bidirectional-mismatch-quarantine-deny-receipt.js` (`FK-RCPT-*`, `mismatchDigest`, Law VI)
- [ ] Policy gate `bidirectional-mismatch-quarantine-deny-policy-gate.js` (mismatch secret-field refuse + FI/FJ/FL elevate refuse + L30–L40 / L41 gates)
- [ ] Port `bidirectional-mismatch-quarantine-deny-port.js` (`govern`, `verifyTrail`)
- [ ] Hermetic tests FK1–FK17; `npm run test:mission-fk`; slim-exclude to hold TR-01 ≤ 145
- [ ] Host apply + `verify:strict` + full `npm test`
- [ ] PR + merge; tip-refresh post-FK is SEPARATE

## Envelope

Docs-only now. ZERO runtime code, ZERO schema JSON, ZERO freeze/matrix edits, ZERO product changes in this draft.

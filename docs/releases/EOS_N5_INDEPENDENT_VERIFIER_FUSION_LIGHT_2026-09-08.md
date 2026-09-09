# EOS N5 Independent verifier fusion-light - 2026-09-08

**Branch:** cursor/eos-n5-independent-fusion-light
**Base main tip:** 33740a6869ba1bda7e75d09fa5489d8410c6e7be (N4 #50 merged)
**Scope:** N5 ONLY (Ladder 3 H5) - Independent verifier fusion-light
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)
**Merge:** NO (push + compare only)

## Gap (H5 / DoD N5)

`verify:independent` / IndependentVerificationHarness centered organic-gate / tdd-receipts / rdd-stance + fixture falsification. It did not light-check custody, engram, fusion-cp, or evd-seal. Operators could believe independent verify covered the post-fusion pack when it did not.

## Design choice (prefer fail-closed)

**Fail-closed measured `--fusion-light` default ON** (CI `verify:independent` path and programmatic suite default).

- Path existence for EvidenceCustody / EngramContract / fusion-cp-lock / evd-seal-path (reuses doctor `POST_FUSION_CRITICAL_PATHS` ids FUSION_CP, CUSTODY, ENGRAM, EVD_SEAL)
- Light import/API smoke (class/exports present; no GameDay soak; does not call full `auditFusionControlPlane` body)
- Explicit **NON-CLAIM** residual always emitted in harness JSON (`fusionLight.nonClaims` / top-level `nonClaims`)
- Opt-out `--no-fusion-light` documents DISABLED NON-CLAIM (not preferred for CI)

Pure slogan docs without measured checks were rejected for N5.

## Deliverables

- `scripts/lib/independent-fusion-light.js`
- `scripts/engine/independent-verification-harness.js` (wire + fail-closed)
- `package.json` `test:n5`
- `tests/eos-n5-independent-fusion-light.test.js`
- `scripts/verify-eos.js` REQUIRED_PATHS N5 entries
- `docs/governance/EOS_INDEPENDENT_EMPIRICAL_VALIDATION_STANDARD.md` fusion-light + NON-CLAIM
- This release note + freeze gate N5 note

## Verify commands

- test:n5
- verify:independent
- verify:strict

## Non-claims

- No App Fuerza. No Fundacion mutation.
- No N6+ in this branch.
- push + compare only; do not merge without PO.
- PRODUCTION_READY remains NO.
- fusion-light is not verify:strict, not full GameDay soak, not I4 empirical validation.

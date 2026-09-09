# EOS N3 Operator Doctor wire + fusion checks - 2026-09-08

**Branch:** cursor/eos-n3-operator-doctor
**Base main tip:** 036f669e6ce6ab873bd69cda646b7e2ba0aa787f (N2 #48 merged)
**Scope:** N3 ONLY (Ladder 3 H3) - wire operator-doctor + post-fusion presence checks
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)
**Merge:** NO (push + compare only)

## Gap (H3 / DoD N3)

operator-doctor.js existed but had no bin, package script, HUD surface, or verify lock.
Checks omitted post-fusion verify/fusion-cp/custody/engram/evd-seal/pre-push presence.

## Fix design

1. Fail-closed post-fusion existence/light checks (VERIFY, FUSION_CP, CUSTODY, ENGRAM, EVD_SEAL, PRE_PUSH)
2. Wire doctor bin + package script eos:doctor
3. Optional HUD OBSERVED doctor section
4. Optional verify:strict REQUIRED_PATHS lock
5. No network or writes from doctor; PRODUCTION_READY unchanged = NO

## Deliverables

- src/core/runtime/operator-doctor.js
- bin/eos-doctor.js
- package.json scripts eos:doctor and test:n3
- src/core/observability/operator-hud.js doctor OBSERVED section
- scripts/verify-eos.js REQUIRED_PATHS entries
- tests/eos-n3-operator-doctor.test.js
- This release note + freeze gate N3 note

## Verify commands

- test:n3
- eos:doctor
- verify:strict

## Non-claims

- No App Fuerza. No Fundacion mutation.
- No N4+ in this branch.
- push + compare only; do not merge without PO.
- PRODUCTION_READY remains NO.
- Doctor is existence/light only — not a substitute for verify:strict smoke.

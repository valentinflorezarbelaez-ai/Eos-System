# EOS N4 HUD + fusion-cp post-G7/M6 lock - 2026-09-08

**Branch:** cursor/eos-n4-hud-fusion-cp-lock
**Base main tip:** 73b6f472b2f18871bf9d0d7a8b3271f8c7b5e957 (N3 #49 merged)
**Scope:** N4 ONLY (Ladder 3 H4) - HUD + fusion-cp post-G7/M6 lock
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)
**Merge:** NO (push + compare only)

## Gap (H4 / DoD N4)

M3 HUD VERIFY_SURFACE_TYPES covered custody/engram/fusion-cp-* but not `evd-seal-path` (emitted by verify-eos after G7).
fusion-cp-lock.js required paths ended at ADR-0013/0014 — silent delete of ADR-0015/0016, mission-os-coherence, or pre-push-hook was weaker than WB/loop/SSOT/gameday lock.

## Fix design

1. Add HUD surface types matching real verify type strings: `evd-seal-path`, `fusion-cp-coherence`, `fusion-cp-pre-push`
2. Extend FUSION_CP_REQUIRED_PATHS with ADR-0015, ADR-0016, mission-os-coherence module, scripts/pre-push-hook.js
3. Light smoke: coherence map schema + assertCoherenceMapComplete; pre-push MAIN_PUSH_DENIED + feature allow
4. verify:strict DENYs via fusion-cp-lock failures + REQUIRED_PATHS existence for N4 test/doc
5. No App Fuerza. No Fundacion mutation. PRODUCTION_READY remains NO.

## Deliverables

- src/core/observability/operator-hud.js
- scripts/lib/fusion-cp-lock.js
- scripts/verify-eos.js (REQUIRED_PATHS N4 entries)
- package.json test:n4
- tests/eos-n4-hud-fusion-cp-lock.test.js
- This release note + freeze gate N4 note

## Verify commands

- test:n4
- test:m1 (regression)
- verify:strict

## Non-claims

- No App Fuerza. No Fundacion mutation.
- No N5+ in this branch.
- push + compare only; do not merge without PO.
- PRODUCTION_READY remains NO.
- Local pre-push surrogate is not GitHub branch-protection enforcement.

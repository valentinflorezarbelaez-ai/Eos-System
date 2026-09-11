# Design — eos-tip-refresh-post-114

## Approach
Zero-drift pointer alignment: pin SSOT tip honesty surfaces to OBSERVED `origin/main` @ `582adbd2f8d6dc9d17e2821098e8991756bc7979` (merge #114).

## Surfaces
1. `docs/releases/EOS_FREEZE_GATE_STATUS.md` — `main_tip` / `main_subject` / hygiene / closeout rows
2. `docs/releases/RELEASE_CAPABILITY_MATRIX.md` — `evaluated_tip` + capability rows
3. `tests/eos-m4-release-ssot-tip.test.js` — EXPECTED_TIP
4. `scripts/lib/dirty-defer-triage-lock.js` — tip honesty needle

## Invariants
PRODUCTION_READY=NO; Fundacion Δ=0; AT_CEILING; no new npm deps.

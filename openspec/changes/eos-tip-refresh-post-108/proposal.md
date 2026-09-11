# Proposal — EOS tip refresh post #108

## Why

Post-#106 tip pin still at `2597436` (#106/#107 era) while merges #107–#108 moved main to `dd6d7c3`. Freeze/matrix/m4 (+ dirty-defer tip honesty) DIVERGE vs live tip. This refresh closes the tip SSOT honesty gap after Mission C2 #108.

## What (this change only)

1. Pin freeze `main_tip` + matrix `evaluated_tip` + `test:m4` EXPECTED_TIP (+ dirty-defer tip honesty) to `dd6d7c3ddfd122535d320bf14ae2e03d8c626c15`
2. Add matrix row tip refresh post #108 MEASURED
3. Spanish/EN evidence: `docs/releases/EOS_TIP_REFRESH_POST_108_2026-09-11.md`
4. This OpenSpec change folder (light)

## Routing

**SDD** (same pattern as tip-refresh-post-106 / tip-refresh-post-l10 / U1 / tip-refresh-post-specboot / S1 / R1 / Q1).

## NON-goals

- PRODUCTION_READY flip
- Mission C2 runtime work
- Fundacion / App Fuerza
- Open/merge PR
- Force-commit DEFER dirty
# Proposal — EOS tip refresh post #103

## Why

Post L10 tip pin still at `e81af1a` (#100/#101 era) while merges #101–#103 moved main to `2d58d51`. Freeze/matrix/m4 (+ dirty-defer tip honesty) DIVERGE vs live tip. This refresh closes the tip SSOT honesty gap (Mission C1).

## What (this change only)

1. Pin freeze `main_tip` + matrix `evaluated_tip` + `test:m4` EXPECTED_TIP (+ dirty-defer tip honesty) to `2d58d51d7eca9d6f5354fe5ee2e59cc77b4dd60c`
2. Add matrix row tip refresh post #103 MEASURED
3. Spanish/EN evidence: `docs/releases/EOS_TIP_REFRESH_POST_103_2026-09-11.md`
4. This OpenSpec change folder (light)

## Routing

**SDD** (same pattern as tip-refresh-post-l10 / U1 / tip-refresh-post-specboot / S1 / R1 / Q1).

## NON-goals

- PRODUCTION_READY flip
- Mission A compute-worker custody fuzz
- Fundacion / App Fuerza
- Open/merge PR
- Force-commit DEFER dirty
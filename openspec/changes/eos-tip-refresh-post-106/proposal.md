# Proposal — EOS tip refresh post #106

## Why

Post L10 tip pin still at `e81af1a` (#100/#101 era) while merges #101–#106 moved main to `2597436`. Freeze/matrix/m4 (+ dirty-defer tip honesty) DIVERGE vs live tip. Prior unmerged C1 tip branch pinned stale `2d58d51` (post-#103) — do not reuse. This refresh closes the tip SSOT honesty gap (Mission C1) after Mission B #106.

## What (this change only)

1. Pin freeze `main_tip` + matrix `evaluated_tip` + `test:m4` EXPECTED_TIP (+ dirty-defer tip honesty) to `25974368cd8c96ffd2fd3da5dc950a79f2cd722d`
2. Add matrix row tip refresh post #106 MEASURED
3. Spanish/EN evidence: `docs/releases/EOS_TIP_REFRESH_POST_106_2026-09-11.md`
4. This OpenSpec change folder (light)

## Routing

**SDD** (same pattern as tip-refresh-post-103 / tip-refresh-post-l10 / U1 / tip-refresh-post-specboot / S1 / R1 / Q1).

## NON-goals

- PRODUCTION_READY flip
- Mission A/B runtime work
- Fundacion / App Fuerza
- Open/merge PR
- Force-commit DEFER dirty

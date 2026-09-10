# Proposal — EOS tip refresh post SpecBoot / AGY

## Why

Post S1 tip pin (`1d1b224`) and merges S2–S4 + SpecBoot/AGY #79 (`b785f01`), freeze/matrix/m4 still pin S1 tip. HUD freeze observe DIVERGEs. This refresh closes the tip SSOT honesty gap.

## What (this change only)

1. Pin freeze `main_tip` + matrix `evaluated_tip` + `test:m4` EXPECTED_TIP to `b785f014e2403964bb3fe36325c220a965295083`
2. Add/normalize matrix rows S4 #78 + SpecBoot/AGY #79 MEASURED (plus S1–S3 honesty)
3. Spanish evidence: `docs/releases/EOS_TIP_REFRESH_POST_SPECBOOT_2026-09-09.md`
4. This OpenSpec change folder (light)

## Routing

**SDD** (same pattern as S1 / R1 / Q1 tip refreshes).

## NON-goals

- PRODUCTION_READY flip
- S5–S6 implementation
- Fundacion / App Fuerza
- Open/merge PR
- Force-commit DEFER dirty

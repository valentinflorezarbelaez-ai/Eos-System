# Proposal — EOS U1 tip refresh post L8

## Why

Post L8 closeout tip pin (`1b48ff5`) and merges T8 #90 + L9 audit #91 (`8781bb3`), freeze/matrix/m4 still pin L8 closeout tip. HUD freeze observe DIVERGEs. This refresh closes the tip SSOT honesty gap (L9 K1 / U1).

## What (this change only)

1. Pin freeze `main_tip` + matrix `evaluated_tip` + `test:m4` EXPECTED_TIP to `8781bb3f6da9b8a404153b5f60f5199d18478226`
2. Add matrix rows Ladder 9 audit #91 MEASURED + U1 tip refresh MEASURED
3. Spanish evidence: `docs/releases/EOS_U1_TIP_REFRESH_POST_L8_2026-09-09.md`
4. This OpenSpec change folder (light)

## Routing

**SDD** (same pattern as tip-refresh-post-specboot / S1 / R1 / Q1).

## NON-goals

- PRODUCTION_READY flip
- U2–U8 implementation
- Fundacion / App Fuerza
- Open/merge PR
- Force-commit DEFER dirty
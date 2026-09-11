# Proposal — Tip refresh post #116

## Why

Main advanced through #115 (tip post #114 @ `aaab3a2`) and #116 (Mission F @ `0b3dacd`). Freeze/matrix still pinned to `582adbd` (#114), so HUD tip observe DIVERGEs.

## What

Pin freeze `main_tip` + matrix `evaluated_tip` + M4 EXPECTED_TIP + dirty-defer tip check to `0b3dacd07633fc7192da41e822402ead61b19f64`. Add Mission F / tip-116 rows. OpenSpec envelope `eos-tip-refresh-post-116`.

## DoD

- Branch `grok/tip-refresh-post-116` from origin/main @0b3dacd
- `npm run test:m4` + `test:t8` PASS; slim ≤145; `verify:strict` EXIT 0
- Push; PRODUCTION_READY=NO; Fundacion Δ=0

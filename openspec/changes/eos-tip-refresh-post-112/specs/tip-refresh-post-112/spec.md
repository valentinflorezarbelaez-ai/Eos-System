# Spec — Tip Refresh post #112

## Requirement

Freeze gate, capability matrix, and test locks MUST declare `main_tip` = `3d5659041c5ff25cbcf0e8b7a89b74f6067363ee` to match live HEAD of `main` after PR #112.

## Scenarios

GIVEN `main` tip at `3d5659041c5ff25cbcf0e8b7a89b74f6067363ee`
WHEN `npm run test:m4` and `npm run test:t8` execute
THEN they PASS with zero divergence
AND `npm run verify:strict` exits 0.

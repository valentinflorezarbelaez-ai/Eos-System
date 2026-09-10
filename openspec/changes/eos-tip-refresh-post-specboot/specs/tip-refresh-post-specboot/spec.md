# Spec delta — tip-refresh-post-specboot

## Requirement

The freeze gate `main_tip`, capability matrix `evaluated_tip`, and `test:m4` EXPECTED_TIP MUST equal the OBSERVED full SHA of origin/main after SpecBoot/AGY #79 (`b785f014e2403964bb3fe36325c220a965295083`).

## Requirement

Matrix MUST include MEASURED rows for Worktree isolation (S4 #78) and SpecBoot cycle + Antigravity-first (#79). Dictamen remains COMPLETE_FOR_LOCAL_GOVERNED_USE; PRODUCTION_READY remains NO.

## Non-requirement

This change MUST NOT flip PRODUCTION_READY, mutate Fundacion, open/merge a PR, or implement S5/S6.

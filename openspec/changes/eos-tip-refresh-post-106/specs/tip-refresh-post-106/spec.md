# Spec delta — tip refresh post #106

## Requirement

Freeze `main_tip`, matrix `evaluated_tip`, and `test:m4` EXPECTED_TIP MUST equal OBSERVED origin/main tip after #106 (`25974368cd8c96ffd2fd3da5dc950a79f2cd722d`). Dirty-defer tip honesty MUST pin the same tip. Matrix MUST mark tip refresh post #106 MEASURED. PRODUCTION_READY remains NO.

## Scenario — tip honesty restored

GIVEN live main tip is 2597436 after #106
WHEN freeze/matrix/m4/dirty-defer tip honesty are refreshed by this change
THEN HUD freeze observe ALIGNED (no DIVERGE vs prior post-L10 pin e81af1a or unmerged post-#103 pin 2d58d51)

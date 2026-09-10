# Spec delta — U1 tip refresh

## Requirement

Freeze `main_tip`, matrix `evaluated_tip`, and `test:m4` EXPECTED_TIP MUST equal OBSERVED origin/main tip after L9 audit #91 (`8781bb3f6da9b8a404153b5f60f5199d18478226`). Matrix MUST mark Ladder 9 audit MEASURED. PRODUCTION_READY remains NO.

## Scenario — tip honesty restored

GIVEN live main tip is 8781bb3 after #91
WHEN freeze/matrix/m4 are refreshed by U1
THEN HUD freeze observe ALIGNED (no DIVERGE vs prior pin 1b48ff5)
# Design — U1 tip refresh post L8

## Approach

Update the tip SSOT triad only: freeze gate header + closed table rows, capability matrix evaluated_tip + rows, test:m4 EXPECTED_TIP + needles. No runtime code. No schema JSON (AT_CEILING).

## Honesty

Pin to live main@8781bb3 after L9 audit #91 (post T8 #90), not to stale L8 closeout pin 1b48ff5, so observeFreezeTipVsHead does not DIVERGE immediately. Tip honesty restored.

## Risks

Low — docs + tip assertion only. Dirty unstaged remains DEFERRED.
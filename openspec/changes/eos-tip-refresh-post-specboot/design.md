# Design — tip refresh post SpecBoot

## Approach

Update the tip SSOT triad only: freeze gate header + closed table rows, capability matrix evaluated_tip + rows, test:m4 EXPECTED_TIP + needles. No runtime code. No schema JSON (AT_CEILING).

## Honesty

Pin to live main@b785f01 after #79, not to S4 tip alone, so observeFreezeTipVsHead does not DIVERGE immediately.

## Risks

Low — docs + tip assertion only. Dirty unstaged remains DEFERRED.

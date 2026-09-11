# Design — tip refresh post L10

## Approach

Update the tip SSOT triad only: freeze gate header + post-L10 section, capability matrix evaluated_tip + tip-refresh row, test:m4 EXPECTED_TIP + needles. No runtime code. No schema JSON (AT_CEILING).

## Honesty

Pin to live main@e81af1a after L10 closeout #100 (post L9 #91–#99), not to stale U1 pin 8781bb3, so observeFreezeTipVsHead does not DIVERGE immediately. Tip honesty restored.

## Risks

Low — docs + tip assertion only. Dirty unstaged remains DEFERRED.

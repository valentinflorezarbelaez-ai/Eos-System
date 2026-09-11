# Design — tip refresh post #108

## Approach

Update the tip SSOT triad only: freeze gate header + post-#108 section, capability matrix evaluated_tip + tip-refresh row, test:m4 EXPECTED_TIP + needles, dirty-defer tip honesty pin. No runtime code. No schema JSON (AT_CEILING).

## Honesty

Pin to live main@dd6d7c3 after #108 (post tip-refresh-post-106 #107 + Mission C2 CI compute worker #108), not to stale post-#106 pin 2597436, so observeFreezeTipVsHead does not DIVERGE immediately. Tip honesty restored.

## Risks

Low — docs + tip assertion only. Dirty unstaged remains DEFERRED.
# Design - tip refresh post #110

## Approach

Update the tip SSOT triad only: freeze gate header + post-#110 section, capability matrix evaluated_tip + tip-refresh row, test:m4 EXPECTED_TIP + needles, dirty-defer tip honesty pin. No runtime code. No schema JSON (AT_CEILING).

## Honesty

Pin to live main@6fe7edc after #110 (post tip-refresh-post-108 #109 + Mission D worker execution custody #110), not to stale post-#108 pin dd6d7c3, so observeFreezeTipVsHead does not DIVERGE immediately. Tip honesty restored.

## Risks

Low - docs + tip assertion only. Dirty unstaged remains DEFERRED.

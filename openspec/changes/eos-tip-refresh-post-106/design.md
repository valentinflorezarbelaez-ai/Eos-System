# Design — tip refresh post #106

## Approach

Update the tip SSOT triad only: freeze gate header + post-#106 section, capability matrix evaluated_tip + tip-refresh row, test:m4 EXPECTED_TIP + needles, dirty-defer tip honesty pin. No runtime code. No schema JSON (AT_CEILING).

## Honesty

Pin to live main@2597436 after #106 (post tip-refresh-post-l10 #101 + compute worker #102 + L10 convergence receipt #103 + Mission A #104 + worker adversarial #105 + Mission B sensor mutation fortify #106), not to stale post-L10 pin e81af1a, and not to the unmerged post-#103 pin 2d58d51, so observeFreezeTipVsHead does not DIVERGE immediately. Tip honesty restored.

## Risks

Low — docs + tip assertion only. Dirty unstaged remains DEFERRED.

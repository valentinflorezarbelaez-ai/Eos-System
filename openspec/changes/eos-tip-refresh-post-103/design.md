# Design — tip refresh post #103

## Approach

Update the tip SSOT triad only: freeze gate header + post-#103 section, capability matrix evaluated_tip + tip-refresh row, test:m4 EXPECTED_TIP + needles, dirty-defer tip honesty pin. No runtime code. No schema JSON (AT_CEILING).

## Honesty

Pin to live main@2d58d51 after #103 (post tip-refresh-post-l10 #101 + compute worker #102 + L10 convergence receipt #103), not to stale post-L10 pin e81af1a, so observeFreezeTipVsHead does not DIVERGE immediately. Tip honesty restored. Mission A not on main at branch time — change named post-103 honestly.

## Risks

Low — docs + tip assertion only. Dirty unstaged remains DEFERRED.
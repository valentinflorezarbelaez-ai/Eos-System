## BOLT'S JOURNAL

## 2024-06-25 - Avoid O(N*M) Reduce Chains in Reporting
**Learning:** `filter().reduce()` chained in a loop over projects creates $O(N \times M)$ complexity. When calculating balances or aggregations where multiple records relate to a common identifier (e.g. `projectId`), it's significantly faster to build an aggregation object mapping identifiers to totals using a single $O(N)$ pass.
**Action:** Replace `for (const id of IDs) { records.filter(...).reduce(...) }` loops with a single loop that aggregates values onto an accumulator object mapping identifiers to totals.

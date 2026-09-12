# Mission AO — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-ao.mjs` on the host worktree.

## Scripts to add

```json
"test:provider-failover-resilience": "node --test tests/eos-ao-provider-failover-resilience.test.js",
"test:mission-ao": "node --test tests/eos-ao-provider-failover-resilience.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-ao-provider-failover-resilience.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

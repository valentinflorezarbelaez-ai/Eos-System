# Mission AE — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-ae.mjs` on the host worktree.

## Scripts to add

```json
"test:token-budget-ecr": "node --test tests/eos-ae-token-budget-ecr.test.js",
"test:mission-ae": "node --test tests/eos-ae-token-budget-ecr.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-ae-token-budget-ecr.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

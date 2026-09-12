# Mission AF — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-af.mjs` on the host worktree.

## Scripts to add

```json
"test:autonomous-execution-loop": "node --test tests/eos-af-autonomous-execution-loop.test.js",
"test:mission-af": "node --test tests/eos-af-autonomous-execution-loop.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-af-autonomous-execution-loop.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

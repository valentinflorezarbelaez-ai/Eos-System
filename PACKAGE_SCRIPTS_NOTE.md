# Mission AG — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-ag.mjs` on the host worktree.

## Scripts to add

```json
"test:live-tool-engine": "node --test tests/eos-ag-live-tool-engine.test.js",
"test:mission-ag": "node --test tests/eos-ag-live-tool-engine.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-ag-live-tool-engine.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

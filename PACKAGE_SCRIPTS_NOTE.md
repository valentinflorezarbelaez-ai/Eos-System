# Mission Z — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-z.mjs` on the host worktree.

## Scripts to add

```json
"test:target-flight": "node --test tests/eos-z-target-flight-sandbox.test.js",
"test:mission-z": "node --test tests/eos-z-target-flight-sandbox.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-z-target-flight-sandbox.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

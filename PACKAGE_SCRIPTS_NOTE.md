# Mission AB — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-ab.mjs` on the host worktree.

## Scripts to add

```json
"test:telemetry-server": "node --test tests/eos-ab-telemetry-server.test.js",
"test:mission-ab": "node --test tests/eos-ab-telemetry-server.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-ab-telemetry-server.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

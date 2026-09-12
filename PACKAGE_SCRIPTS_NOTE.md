# Mission AA — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-aa.mjs` on the host worktree.

## Scripts to add

```json
"test:multi-agent-swarm": "node --test tests/eos-aa-multi-agent-swarm.test.js",
"test:mission-aa": "node --test tests/eos-aa-multi-agent-swarm.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-aa-multi-agent-swarm.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

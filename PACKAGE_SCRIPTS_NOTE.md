# Mission AI — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-ai.mjs` on the host worktree.

## Scripts to add

```json
"test:multi-session-autonomy": "node --test tests/eos-ai-multi-session-autonomy.test.js",
"test:mission-ai": "node --test tests/eos-ai-multi-session-autonomy.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-ai-multi-session-autonomy.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

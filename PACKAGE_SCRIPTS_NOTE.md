# Mission AD — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-ad.mjs` on the host worktree.

## Scripts to add

```json
"test:llm-provider-port": "node --test tests/eos-ad-llm-provider-port.test.js",
"test:mission-ad": "node --test tests/eos-ad-llm-provider-port.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-ad-llm-provider-port.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

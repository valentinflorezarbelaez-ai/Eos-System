# Mission AX — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-ax.mjs` on the host worktree.

## Scripts to add

```json
"test:developer-engine-core": "node --test tests/eos-ax-sovereign-developer-engine.test.js",
"test:mission-ax": "node --test tests/eos-ax-sovereign-developer-engine.test.js",
"test:sovereign-developer-engine": "node --test tests/eos-ax-sovereign-developer-engine.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-ax-sovereign-developer-engine.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

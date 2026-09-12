# Mission AV — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-av.mjs` on the host worktree.

## Scripts to add

```json
"test:freeze-drift": "node --test tests/eos-av-governed-state-freeze-drift-observer.test.js",
"test:mission-av": "node --test tests/eos-av-governed-state-freeze-drift-observer.test.js",
"test:release-honesty": "node --test tests/eos-av-governed-state-freeze-drift-observer.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-av-governed-state-freeze-drift-observer.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

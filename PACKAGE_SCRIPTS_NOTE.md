# Mission AY — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-ay.mjs` on the host worktree.

## Scripts to add

```json
"test:ast-semantic-port": "node --test tests/eos-ay-ast-semantic-port.test.js",
"test:mission-ay": "node --test tests/eos-ay-ast-semantic-port.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-ay-ast-semantic-port.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

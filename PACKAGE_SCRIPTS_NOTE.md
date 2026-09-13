# Mission BC — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-bc.mjs` on the host worktree.

## Scripts to add

```json
"test:governed-patch-apply": "node --test tests/eos-bc-governed-patch-diff-apply-port.test.js",
"test:mission-bc": "node --test tests/eos-bc-governed-patch-diff-apply-port.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-bc-governed-patch-diff-apply-port.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

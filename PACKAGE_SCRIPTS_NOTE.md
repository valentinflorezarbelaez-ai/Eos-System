# Mission AZ — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-az.mjs` on the host worktree.

## Scripts to add

```json
"test:self-repair-bridge": "node --test tests/eos-az-self-repair-fdir-bridge.test.js",
"test:mission-az": "node --test tests/eos-az-self-repair-fdir-bridge.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-az-self-repair-fdir-bridge.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

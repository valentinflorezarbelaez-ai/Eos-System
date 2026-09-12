# Mission AP — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-ap.mjs` on the host worktree.

## Scripts to add

```json
"test:hitl-po-authority": "node --test tests/eos-ap-hitl-po-authority-channel.test.js",
"test:mission-ap": "node --test tests/eos-ap-hitl-po-authority-channel.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-ap-hitl-po-authority-channel.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

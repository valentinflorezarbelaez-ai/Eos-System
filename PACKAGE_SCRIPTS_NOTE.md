# Mission AU — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-au.mjs` on the host worktree.

## Scripts to add

```json
"test:law-vi-broker": "node --test tests/eos-au-law-vi-secret-runtime-broker.test.js",
"test:secret-runtime-broker": "node --test tests/eos-au-law-vi-secret-runtime-broker.test.js",
"test:mission-au": "node --test tests/eos-au-law-vi-secret-runtime-broker.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-au-law-vi-secret-runtime-broker.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

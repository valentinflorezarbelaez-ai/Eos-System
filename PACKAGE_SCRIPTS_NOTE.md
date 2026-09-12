# Mission AQ — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-aq.mjs` on the host worktree.

## Scripts to add

```json
"test:evidence-export-notarization": "node --test tests/eos-aq-evidence-export-notarization.test.js",
"test:mission-aq": "node --test tests/eos-aq-evidence-export-notarization.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-aq-evidence-export-notarization.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

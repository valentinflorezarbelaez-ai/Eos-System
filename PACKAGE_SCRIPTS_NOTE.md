# Mission AK — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-ak.mjs` on the host worktree.

## Scripts to add

```json
"test:constitution-runtime-policy-gate": "node --test tests/eos-ak-constitution-runtime-policy-gate.test.js",
"test:mission-ak": "node --test tests/eos-ak-constitution-runtime-policy-gate.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-ak-constitution-runtime-policy-gate.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

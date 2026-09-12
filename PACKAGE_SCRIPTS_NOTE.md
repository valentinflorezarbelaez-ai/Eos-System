# Mission W — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-w.mjs` on the host worktree.

## Scripts to add

```json
"test:sovereign-session": "node --test tests/session/sovereign-session-coordinator.test.js",
"test:mission-w": "node --test tests/session/sovereign-session-coordinator.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'sovereign-session-coordinator.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after `fdir-remediation-loop.test.js`
or whatever the tip currently ends with). Prefer exclude-from-slim over raising TR-01.

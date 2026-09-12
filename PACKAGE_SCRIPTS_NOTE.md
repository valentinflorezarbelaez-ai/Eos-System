# Mission V — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-v.mjs` on the host worktree.

## Scripts to add

```json
"test:fdir-remediation": "node --test tests/fdir/fdir-remediation-loop.test.js",
"test:mission-v": "node --test tests/fdir/fdir-remediation-loop.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'fdir-remediation-loop.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after `external-write-gateway.test.js`
or whatever the tip currently ends with). Prefer exclude-from-slim over raising TR-01.

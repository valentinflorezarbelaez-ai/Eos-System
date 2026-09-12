# Mission X — package.json / slim / bin patch fragment

Applied idempotently by `scripts/patch-mission-x.mjs` on the host worktree.

## Scripts to add

```json
"test:developer-shell": "node --test tests/cli/interactive-developer-shell.test.js",
"test:mission-x": "node --test tests/cli/interactive-developer-shell.test.js"
```

## Bin field (optional)

```json
"bin": {
  "eos-shell": "bin/eos-shell.js"
}
```

If host mission-cli already owns an `eos` binary with subcommands, prefer documenting
an `eos shell` alias that execs `bin/eos-shell.js` rather than fighting the CLI
router. Tiny patcher snippet (already in `patch-mission-x.mjs`):

```js
pkg.bin = pkg.bin || {};
pkg.bin['eos-shell'] = 'bin/eos-shell.js';
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'interactive-developer-shell.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after `sovereign-session-coordinator.test.js`
or whatever the tip currently ends with). Prefer exclude-from-slim over raising TR-01.

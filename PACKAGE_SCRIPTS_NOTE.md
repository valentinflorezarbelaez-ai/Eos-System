# Mission BH — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-bh.mjs` on the host worktree.

## Scripts to add

```json
"test:mission-bh": "node --test tests/eos-bh-mission-lifecycle-state-machine.test.js",
"test:mission-lifecycle": "node --test tests/eos-bh-mission-lifecycle-state-machine.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-bh-mission-lifecycle-state-machine.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

## Envelope copy (bootstrap)

`MISSION_BH_BOOTSTRAP.ps1` `$paths` / `git add` also copies:

- `docs/adrs/ADR-0024-mission-bh-lifecycle-state-machine.md`
- `docs/evidence/EOS_MISSION_BH_LIFECYCLE_STATE_MACHINE_EVD_2026-09-14.md`
- OpenSpec change folder (proposal / design / spec / tasks / `.openspec.yaml`)

so future boots land the envelope. Docs-only; does not flip PRODUCTION_READY.

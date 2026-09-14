# Mission BD — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-bd.mjs` on the host worktree.

## Scripts to add

```json
"test:multi-target-delivery": "node --test tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js",
"test:mission-bd": "node --test tests/eos-bd-multi-worktree-multi-target-delivery-port.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-bd-multi-worktree-multi-target-delivery-port.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

## Envelope copy (bootstrap)

`MISSION_BD_BOOTSTRAP.ps1` `$paths` / `git add` also copies:

- `docs/adrs/ADR-0019-mission-bd-multi-worktree-multi-target-delivery-port.md`
- `docs/evidence/EOS_MISSION_BD_EVIDENCE_2026-09-13.md`

so future boots land the envelope (spec/tasks/design already in the OpenSpec
change folder). Docs-only; does not flip PRODUCTION_READY.


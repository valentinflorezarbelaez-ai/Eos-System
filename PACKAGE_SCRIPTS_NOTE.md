# Mission BJ — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-bj.mjs` on the host worktree.

## Scripts to add

```json
"test:mission-bj": "node --test tests/eos-bj-operator-dashboard-hud-fabric.test.js",
"test:operator-dashboard-hud": "node --test tests/eos-bj-operator-dashboard-hud-fabric.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-bj-operator-dashboard-hud-fabric.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

## Envelope copy (bootstrap)

`MISSION_BJ_BOOTSTRAP.ps1` `$paths` / `git add` also copies:

- `docs/adrs/ADR-0026-mission-bj-operator-dashboard-hud-fabric.md`
- `docs/evidence/EOS_MISSION_BJ_OPERATOR_DASHBOARD_HUD_EVD_2026-09-14.md`
- OpenSpec change folder (proposal / design / spec / tasks / `.openspec.yaml`)

so future boots land the envelope. Docs-only; does not flip PRODUCTION_READY.

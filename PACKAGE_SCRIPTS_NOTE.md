# Mission BI — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-bi.mjs` on the host worktree.

## Scripts to add

```json
"test:mission-bi": "node --test tests/eos-bi-cross-session-continuity-replay-fabric.test.js",
"test:cross-session-continuity": "node --test tests/eos-bi-cross-session-continuity-replay-fabric.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-bi-cross-session-continuity-replay-fabric.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

## Envelope copy (bootstrap)

`MISSION_BI_BOOTSTRAP.ps1` `$paths` / `git add` also copies:

- `docs/adrs/ADR-0025-mission-bi-cross-session-continuity-replay-fabric.md`
- `docs/evidence/EOS_MISSION_BI_CROSS_SESSION_CONTINUITY_EVD_2026-09-14.md`
- OpenSpec change folder (proposal / design / spec / tasks / `.openspec.yaml`)

so future boots land the envelope. Docs-only; does not flip PRODUCTION_READY.

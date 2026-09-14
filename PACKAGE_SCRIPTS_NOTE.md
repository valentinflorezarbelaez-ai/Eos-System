# Mission BF — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-bf.mjs` on the host worktree.

## Scripts to add

```json
"test:local-rc-packaging": "node --test tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js",
"test:mission-bf": "node --test tests/eos-bf-local-rc-packaging-artifact-notary-port.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-bf-local-rc-packaging-artifact-notary-port.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

## Envelope copy (bootstrap)

`MISSION_BF_BOOTSTRAP.ps1` `$paths` / `git add` also copies:

- `docs/adrs/ADR-0021-mission-bf-local-rc-packaging-artifact-notary-port.md`
- `docs/evidence/EOS_MISSION_BF_EVIDENCE_2026-09-14.md`
- OpenSpec change folder (proposal / design / spec / tasks / `.openspec.yaml`)

so future boots land the envelope. Docs-only; does not flip PRODUCTION_READY.

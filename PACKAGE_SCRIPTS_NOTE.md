# Mission BE — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-be.mjs` on the host worktree.

## Scripts to add

```json
"test:verification-replay": "node --test tests/eos-be-verification-replay-golden-receipt-port.test.js",
"test:mission-be": "node --test tests/eos-be-verification-replay-golden-receipt-port.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-be-verification-replay-golden-receipt-port.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145).

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

## Envelope copy (bootstrap)

`MISSION_BE_BOOTSTRAP.ps1` `$paths` / `git add` also copies:

- `docs/adrs/ADR-0020-mission-be-verification-replay-golden-receipt-port.md`
- `docs/evidence/EOS_MISSION_BE_EVIDENCE_2026-09-13.md`
- OpenSpec change folder (proposal / design / spec / tasks / `.openspec.yaml`)

so future boots land the envelope. Docs-only; does not flip PRODUCTION_READY.

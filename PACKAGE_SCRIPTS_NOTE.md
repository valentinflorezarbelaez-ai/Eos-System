# Mission BO — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-bo.mjs` on the host worktree.

## Scripts to add

```json
"test:mission-bo": "node --test tests/eos-bo-multi-agent-consensus-gate.test.js",
"test:multi-agent-consensus-gate": "node --test tests/eos-bo-multi-agent-consensus-gate.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-bo-multi-agent-consensus-gate.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145) — same as BH/BK/BM/BN.

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

## Envelope copy (bootstrap)

`MISSION_BO_BOOTSTRAP.ps1` `$paths` / `git add` also copies:

- `docs/adrs/ADR-0032-mission-bo-multi-agent-consensus-gate.md`
- `docs/evidence/EOS_MISSION_BO_MULTI_AGENT_CONSENSUS_EVD_2026-09-14.md`
- OpenSpec change folder (proposal / design / spec / tasks / `.openspec.yaml`)

so future boots land the envelope. Docs-only; does not flip PRODUCTION_READY.
Git-add pathspecs list ONLY real paths (BL pathspec lesson).

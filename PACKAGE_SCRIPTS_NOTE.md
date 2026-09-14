# Mission BM — package.json / slim patch fragment

Applied idempotently by `scripts/patch-mission-bm.mjs` on the host worktree.

## Scripts to add

```json
"test:mission-bm": "node --test tests/eos-bm-agent-identity-attestation-port.test.js",
"test:agent-identity-attestation": "node --test tests/eos-bm-agent-identity-attestation-port.test.js"
```

## SLIM_SUITE_EXCLUDES (scripts/test-runner.js)

Add basename:

```js
'eos-bm-agent-identity-attestation-port.test.js',
```

to the existing `SLIM_SUITE_EXCLUDES` Set (after the current last entry).
CRLF-safe insert: patcher uses `[\s\S]` + `[\r\n]` patterns (NOT `[^\n]*` alone).
Prefer exclude-from-slim over raising TR-01 (slim≤145) — same as BH/BK.

Hermetic satellite — excluded from slim so SLIM_COUNT stays ≤145.

## Envelope copy (bootstrap)

`MISSION_BM_BOOTSTRAP.ps1` `$paths` / `git add` also copies:

- `docs/adrs/ADR-0030-mission-bm-agent-identity-attestation.md`
- `docs/evidence/EOS_MISSION_BM_AGENT_IDENTITY_ATTESTATION_EVD_2026-09-14.md`
- OpenSpec change folder (proposal / design / spec / tasks / `.openspec.yaml`)

so future boots land the envelope. Docs-only; does not flip PRODUCTION_READY.
Git-add pathspecs list ONLY real paths (BL pathspec lesson).

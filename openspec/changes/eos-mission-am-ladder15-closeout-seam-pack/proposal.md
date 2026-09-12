# Proposal — Mission AM: Ladder 15 CI Seam-Pack + Closeout (SPEC-0044)

## Why

Missions AI/AJ/AK/AL landed as npm satellite suites (`test:multi-session-autonomy`,
`test:evidence-economy-ledger`, `test:constitution-runtime-policy-gate`,
`test:autonomy-replay-forensic-observer`) but are not yet required in the CI
`seam-pack` job. Ladder 15 closeout needs those satellites fail-closed in GitHub
Actions without raising TR-01 or flipping PRODUCTION_READY.

## What

1. Idempotent patcher `scripts/patch-mission-am.mjs` (CRLF-safe `[^\r\n]*`):
   - Extend `.github/workflows/ci.yml` seam-pack with the four satellite runs
     (keep Fundacion freeze; no soak; no continue-on-error).
   - Extend `test:native-suite-pack`; add `test:mission-am` / `test:am15` /
     `test:ladder15-pack`; ensure mission-ai/aj/ak/al aliases.
   - Slim-exclude lock basename `eos-am-ladder15-seam-pack.test.js`.
   - Append Mission AM / Ladder 15 notes to `CI_CD_CONTRACT.md`.
   - Add assert-gha-contract needles when present.
2. Lock test `tests/eos-am-ladder15-seam-pack.test.js` (≥12 cases AM1–AM14).
3. Ladder 15 closeout audit + Mission AM release report + OpenSpec.

## DoD

Branch `grok/mission-am-ladder15-closeout-seam-pack` from Expected
`5a2bc8044d0037bcd5a5419b000f5258eb91209e` (StartsWith `5a2bc80` OK);
`npm run test:mission-am` / `test:am15` green; slim≤145; verify:strict EXIT 0 on host.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion Δ opened
- TR-01 raise
- soak / continue-on-error
- CloudAgent
- New npm deps
- GH billing / enforcement claims

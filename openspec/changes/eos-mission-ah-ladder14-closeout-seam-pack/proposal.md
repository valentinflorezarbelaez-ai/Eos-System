# Proposal — Mission AH: Ladder 14 CI Seam-Pack + Closeout (SPEC-0039)

## Why

Missions AD/AE/AF/AG landed as npm satellite suites (`test:llm-provider-port`,
`test:token-budget-ecr`, `test:autonomous-execution-loop`, `test:live-tool-engine`)
but are not yet required in the CI `seam-pack` job. Ladder 14 closeout needs those
satellites fail-closed in GitHub Actions without raising TR-01 or flipping
PRODUCTION_READY. User CI pin uses `test:autonomous-loop` as the AF script name,
so the patcher must seed that alias to the same AF test file.

## What

1. Idempotent patcher `scripts/patch-mission-ah.mjs` (CRLF-safe `[^\r\n]*`):
   - Extend `.github/workflows/ci.yml` seam-pack with the four satellite runs
     (keep Fundacion freeze; no soak; no continue-on-error).
   - Extend `test:native-suite-pack`; add `test:mission-ah` / `test:ah14` /
     `test:ladder14-pack`; ensure mission-ad/ae/af/ag aliases; ensure
     `test:autonomous-loop` alongside `test:autonomous-execution-loop`.
   - Slim-exclude lock basename `eos-ah-ladder14-seam-pack.test.js`.
   - Append Mission AH / Ladder 14 notes to `CI_CD_CONTRACT.md`.
   - Add assert-gha-contract needles when present.
2. Lock test `tests/eos-ah-ladder14-seam-pack.test.js` (≥8 cases AH1–AH8).
3. Ladder 14 closeout audit + Mission AH release report + OpenSpec.

## DoD

Branch `grok/mission-ah-ladder14-closeout-seam-pack` from Expected
`e731396a9b604a97d7819f95ee096f31599e393d` (StartsWith `e731396` OK);
`npm run test:mission-ah` / `test:ah14` green; slim≤145; verify:strict EXIT 0 on host.

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

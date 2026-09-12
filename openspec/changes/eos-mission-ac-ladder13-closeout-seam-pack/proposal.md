# Proposal — Mission AC: Ladder 13 CI Seam-Pack + Closeout (SPEC-0034)

## Why

Missions Z/AA/AB landed as npm satellite suites (`test:target-flight`,
`test:multi-agent-swarm`, `test:telemetry-server`) but are not yet required in
the CI `seam-pack` job. Ladder 13 closeout needs those satellites fail-closed
in GitHub Actions without raising TR-01 or flipping PRODUCTION_READY.

## What

1. Idempotent patcher `scripts/patch-mission-ac.mjs`:
   - Extend `.github/workflows/ci.yml` seam-pack with the three satellite runs
     (keep Fundacion freeze; no soak; no continue-on-error).
   - Extend `test:native-suite-pack`; add `test:mission-ac` / `test:ac13` /
     `test:ladder13-pack`; ensure `test:mission-z` / `test:mission-aa` /
     `test:mission-ab` aliases if missing.
   - Slim-exclude lock basename `eos-ac-ladder13-seam-pack.test.js`.
   - Append Mission AC / Ladder 13 notes to `CI_CD_CONTRACT.md`.
   - Add assert-gha-contract needles when present.
2. Lock test `tests/eos-ac-ladder13-seam-pack.test.js` (≥6 cases AC1–AC8).
3. Ladder 13 closeout audit + Mission AC release report + OpenSpec.

## DoD

Branch `grok/mission-ac-ladder13-closeout-seam-pack` from Expected
`33752f362ec38f6d70ff5524a4be5035637adf51`; `npm run test:mission-ac` /
`test:ac13` green; slim≤145; verify:strict EXIT 0 on host.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion Δ opened
- TR-01 raise
- soak / continue-on-error
- CloudAgent
- New npm deps

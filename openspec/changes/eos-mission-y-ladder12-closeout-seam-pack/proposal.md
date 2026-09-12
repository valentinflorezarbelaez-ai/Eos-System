# Proposal — Mission Y: Ladder 12 CI Seam-Pack + Closeout (SPEC-0030)

## Why

Missions V/W/X landed as npm satellite suites (`test:fdir-remediation`,
`test:sovereign-session`, `test:developer-shell`) but are not yet required in
the CI `seam-pack` job. Ladder 12 closeout needs those satellites fail-closed
in GitHub Actions without raising TR-01 or flipping PRODUCTION_READY.

## What

1. Idempotent patcher `scripts/patch-mission-y.mjs`:
   - Extend `.github/workflows/ci.yml` seam-pack with the three satellite runs
     (keep Fundacion freeze; no soak; no continue-on-error).
   - Extend `test:native-suite-pack`; add `test:mission-y` / `test:y12` /
     `test:ladder12-pack`.
   - Slim-exclude lock basename `eos-y-ladder12-seam-pack.test.js`.
   - Append Mission Y / Ladder 12 notes to `CI_CD_CONTRACT.md`.
   - Add assert-gha-contract needles when present.
2. Lock test `tests/eos-y-ladder12-seam-pack.test.js` (≥6 cases Y1–Y8).
3. Ladder 12 closeout audit + Mission Y release report + OpenSpec.

## DoD

Branch `grok/mission-y-ladder12-closeout-seam-pack` from Expected
`960f334a082e5ef7d115c6b79171f231cd8ce257`; `npm run test:mission-y` /
`test:y12` green; slim≤145; verify:strict EXIT 0 on host.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion Δ opened
- TR-01 raise
- soak / continue-on-error
- CloudAgent
- New npm deps

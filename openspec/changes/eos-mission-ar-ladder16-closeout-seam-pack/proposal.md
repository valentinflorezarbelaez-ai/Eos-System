# Proposal — Mission AR: Ladder 16 CI Seam-Pack + Closeout (SPEC-0049)

## Why

Missions AN/AO/AP/AQ landed as npm satellite suites (`test:multi-workstation-federation`,
`test:provider-failover-resilience`, `test:hitl-po-authority`,
`test:evidence-export-notarization`) but are not yet required in the CI
`seam-pack` job. Ladder 16 closeout needs those satellites fail-closed in GitHub
Actions without raising TR-01 or flipping PRODUCTION_READY.

## What

1. Idempotent patcher `scripts/patch-mission-ar.mjs` (CRLF-safe `[^\r\n]*`):
   - Extend `.github/workflows/ci.yml` seam-pack with the four satellite runs
     (keep Fundacion freeze; no soak; no continue-on-error).
   - Extend `test:native-suite-pack`; add `test:mission-ar` / `test:ar16` /
     `test:l16` / `test:ladder16-pack`; ensure mission-an/ao/ap/aq aliases.
   - Slim-exclude lock basename `eos-ar-ladder16-seam-pack.test.js`.
   - Append Mission AR / Ladder 16 notes to `CI_CD_CONTRACT.md`.
   - Add assert-gha-contract needles when present.
2. Lock test `tests/eos-ar-ladder16-seam-pack.test.js` (≥12 cases AR1–AR15).
3. Ladder 16 closeout audit + Mission AR release report + OpenSpec.

## DoD

Branch `grok/mission-ar-ladder16-closeout-seam-pack` from Expected
`f4869c44ddb515d97fe5b6a7ae89d1b09230ee40` (StartsWith `f4869c4` OK);
`npm run test:mission-ar` / `test:ar16` / `test:l16` green; slim≤145;
verify:strict EXIT 0 on host. Tip honesty ritual left to post-AR tip refresh.

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
- Reimplement AN–AQ modules (CI seam wiring + closeout only)
- Tip honesty ritual (deferred)

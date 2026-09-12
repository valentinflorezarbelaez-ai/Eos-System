# Proposal — Mission U: Native Suite CI Seam-Pack + Ladder 11 (SPEC-0026)

## Why

Macros P–T and native compute-worker satellites I/L/M/N/O exist as npm scripts but are not yet required in the CI `seam-pack` job. Ladder 11 closeout needs those satellites fail-closed in GitHub Actions without raising TR-01 or flipping PRODUCTION_READY.

## What

1. Extend `.github/workflows/ci.yml` seam-pack named pack with the ten satellite scripts (keep Fundacion freeze; no soak; no continue-on-error).
2. Add `test:native-suite-pack` (chain alias) + `test:mission-u` / `test:u11` lock.
3. Lock test `tests/eos-u-native-suite-seam-pack.test.js` (U1–U8).
4. Update `CI_CD_CONTRACT.md` + `assert-gha-contract.js` needles.
5. Ladder 11 closeout audit + Mission U release report + OpenSpec.

## DoD

Branch `grok/mission-u-native-suite-seam-pack` from Expected `e1e0b24ca32d60468fb4808db27a6ba4990310cf`; `npm run test:mission-u` green; slim≤145; verify:strict EXIT 0 on host.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion Δ opened
- TR-01 raise
- soak / continue-on-error
- CloudAgent
- New npm deps

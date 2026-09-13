# Proposal — Mission BB: Ladder 18 CI Seam-Pack + Closeout (SPEC-0059)

## Why

Missions AX/AY/AZ/BA landed as npm satellite suites (`test:developer-engine-core`,
`test:ast-semantic-port`, `test:self-repair-bridge`,
`test:local-sandbox-port`) but are not yet required in the CI
`seam-pack` job. Ladder 18 closeout needs those satellites fail-closed in GitHub
Actions without raising TR-01 or flipping PRODUCTION_READY. L17 remains CLOSED
and must never be reopened.

## What

1. Idempotent patcher `scripts/patch-mission-bb.mjs` (CRLF-safe `[^\r\n]*`):
   - Extend `.github/workflows/ci.yml` seam-pack with the four satellite runs
     (keep Fundacion freeze; no soak; no continue-on-error).
   - Extend `test:native-suite-pack`; add `test:mission-bb` / `test:bb18` /
     `test:l18` / `test:ladder18-pack`; ensure mission-ax/ay/az/ba aliases.
   - Slim-exclude lock basename `eos-bb-ladder18-seam-pack.test.js`.
   - Append Mission BB / Ladder 18 notes to `CI_CD_CONTRACT.md` (governance or releases).
   - Add assert-gha-contract needles when present.
2. Lock test `tests/eos-bb-ladder18-seam-pack.test.js` (≥12 cases BB1–BB16).
3. Ladder 18 closeout audit + Mission BB release report + OpenSpec.

## DoD

Branch `grok/mission-bb-ladder18-closeout-seam-pack` from Expected
`b206bf3ebcab797ade293bff4da59a11af8e5f06` (StartsWith `b206bf3` OK);
`npm run test:mission-bb` / `test:bb18` / `test:l18` green; slim≤145;
verify:strict EXIT 0 on host. Tip honesty ritual left to post-BB tip refresh.

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
- Reimplement AX–BA modules (CI seam wiring + closeout only)
- Reopen Ladder 17
- Tip honesty ritual (deferred)

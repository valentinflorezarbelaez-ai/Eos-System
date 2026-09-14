# Proposal — Mission BG: Ladder 19 CI Seam-Pack + Closeout (SPEC-0064)

## Why

Missions BC/BD/BE/BF landed as npm satellite suites (`test:governed-patch-apply`,
`test:multi-target-delivery`, `test:verification-replay`,
`test:local-rc-packaging`) but are not yet required in the CI
`seam-pack` job. Ladder 19 closeout needs those satellites fail-closed in GitHub
Actions without raising TR-01 or flipping PRODUCTION_READY. L17 and L18 remain
CLOSED and must never be reopened. After BG, Ladder 19 is
CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen L19 after closeout.

Axis: **Sovereign Delivery & Verification Fabric**.

## What

1. Idempotent patcher `scripts/patch-mission-bg.mjs` (CRLF-safe `[^\r\n]*`):
   - Extend `.github/workflows/ci.yml` seam-pack with the four satellite runs
     (keep Fundacion freeze; no soak; no continue-on-error).
   - Extend `test:native-suite-pack`; add `test:mission-bg` / `test:bg19` /
     `test:l19` / `test:ladder19-pack`; ensure mission-bc/bd/be/bf aliases.
   - Slim-exclude lock basename `eos-bg-ladder19-seam-pack.test.js`.
   - Append Mission BG / Ladder 19 notes to `CI_CD_CONTRACT.md` (governance or releases).
   - Add assert-gha-contract needles when present.
2. Lock test `tests/eos-bg-ladder19-seam-pack.test.js` (≥16 cases BG1–BG18).
3. Ladder 19 closeout audit + Mission BG release report + OpenSpec + ADR-0022 + evidence.
4. No rewrite of BC/BD/BE/BF modules — compose via CI scripts only.

## DoD

Branch `grok/mission-bg-ladder19-closeout-seam-pack` from Expected
`37a36e9f0ed9dab61b3d997edd777e49d2eb7a16` (StartsWith `37a36e9` OK; #280 BF MEASURED);
`npm run test:mission-bg` / `test:bg19` / `test:l19` green; slim≤145;
verify:strict EXIT 0 on host. Tip honesty ritual left to post-BG tip refresh.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion Δ opened
- TR-01 raise
- soak / continue-on-error
- CloudAgent
- New npm deps
- GH billing / Team / Enterprise enforcement claims
- Rewrite BC–BF modules (CI seam wiring + closeout only)
- Reopen Ladder 17
- Reopen Ladder 18
- Reopen Ladder 19 after closeout / leave L19 unclosed after BG
- Tip honesty ritual (deferred)

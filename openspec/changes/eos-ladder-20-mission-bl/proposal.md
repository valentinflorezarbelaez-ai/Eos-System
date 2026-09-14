# Proposal — Mission BL: Ladder 20 CI Seam-Pack + Closeout (SPEC-0069)

## Why

Missions BH/BI/BJ/BK landed as npm satellite suites (`test:mission-bh`,
`test:mission-bi`, `test:mission-bj`, `test:mission-bk`) with sealed receipt
prefixes BH-RCPT-* / BI-RCPT-* / BJ-RCPT-* / BK-RCPT-* but are not yet required
in the CI `seam-pack` job. Ladder 20 closeout needs those satellites fail-closed
in GitHub Actions without raising TR-01 or flipping PRODUCTION_READY. L17, L18,
and L19 remain CLOSED and must never be reopened. After BL, Ladder 20 is
CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen L20 after closeout.

Axis: **Sovereign Mission Continuity & Operator Fabric**.

## What

1. Idempotent patcher `scripts/patch-mission-bl.mjs` (CRLF-safe `[^\r\n]*`):
   - Extend `.github/workflows/ci.yml` seam-pack with the four satellite runs
     (keep Fundacion freeze; no soak; no continue-on-error).
   - Extend `test:native-suite-pack`; add `test:mission-bl` / `test:bl20` /
     `test:l20` / `test:ladder20-pack`; ensure lifecycle/continuity/HUD/write aliases.
   - Slim-exclude lock basename `eos-bl-ladder20-seam-pack.test.js`.
   - Append Mission BL / Ladder 20 notes to `CI_CD_CONTRACT.md` (governance or releases).
   - Add assert-gha-contract needles when present.
2. Lock test `tests/eos-bl-ladder20-seam-pack.test.js` (≥18 cases BL1–BL20).
3. Ladder 20 closeout audit + Mission BL release report + OpenSpec + ADR-0028 + evidence.
4. No rewrite of BH/BI/BJ/BK modules — compose via CI scripts only.

## DoD

Branch `grok/mission-bl-ladder20-closeout-seam-pack` from Expected
`dd225d9b9ca8851110ed6b38513e35c0092e02ff` (StartsWith `dd225d9` OK; tip #294 / Mission BK MEASURED);
`npm run test:mission-bl` / `test:bl20` / `test:l20` green; slim≤145;
verify:strict EXIT 0 on host. Tip honesty ritual left to post-BL tip refresh.

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
- Rewrite BH–BK modules (CI seam wiring + closeout only)
- Reopen Ladder 17 / 18 / 19
- Reopen Ladder 20 after closeout / leave L20 unclosed after BL
- Tip honesty ritual (deferred)

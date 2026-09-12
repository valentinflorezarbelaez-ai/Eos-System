# Mission AW: SPEC-0054 Ladder 17 CI Seam-Pack Consolidation & Closeout Proposal

## Problem Statement

Ladder 17 established four key operational satellites:
1. **Mission AS (SPEC-0050):** Cross-Satellite Composition Harness (AN×AO×AP×AQ).
2. **Mission AT (SPEC-0051):** Operator Continuity / Crash-Recovery Custody Port.
3. **Mission AU (SPEC-0052):** Law VI Secret Runtime Broker / Env Gate.
4. **Mission AV (SPEC-0053):** Governed State Freeze & Drift Observer.

Each satellite has been individually tested, verified, and merged into `main`. However, in accordance with the EOS ladder closeout discipline (mirroring U for L11, Y for L12, AC for L13, AH for L14, AM for L15, and AR for L16), Ladder 17 cannot be declared `CLOSED_FOR_LOCAL_GOVERNED_USE` until all four satellites are consolidated into:
- The GitHub Actions CI seam-pack job fail-closed.
- Package test script aliases and `test:ladder17-pack`.
- Extended `test:native-suite-pack`.
- CI/CD governance contracts and verification locks.
- A hermetic test suite (`eos-aw-ladder17-seam-pack.test.js`) excluded from the slim discovery suite to honor `TR-01 ≤ 145`.

## Scope & Deliverables

- **CI Workflow:** Extend `.github/workflows/ci.yml` `strict-verify` and `seam-pack` jobs to require AS, AT, AU, AV.
- **Package Scripts:** Add `test:mission-aw`, `test:aw17`, `test:l17`, `test:ladder17-pack`, and extend `test:native-suite-pack`.
- **Harness & Runner:** Add `eos-aw-ladder17-seam-pack.test.js` to `SLIM_SUITE_EXCLUDES`.
- **Contracts:** Add `CI_CD_CONTRACT.ladder17-fragment.md` and update `CI_CD_CONTRACT.md` and `assert-gha-contract.js`.
- **Release Reports:** Publish `EOS_MISSION_AW_LADDER17_SEAM_PACK_2026-09-12.md` and `EOS_LADDER_17_CLOSEOUT_2026-09-12.md`.
- **Patcher:** Provide idempotent, CRLF-safe `scripts/patch-mission-aw.mjs`.

## Non-Goals

- Flipping `PRODUCTION_READY=YES` (remains strictly `NO`).
- Mutating `Documents/Fundacion` (`Δ=0`).
- Adding soak tests or `continue-on-error: true`.
- Raising `TR-01` slim ceiling beyond 145.
- Introducing CloudAgent or external runtime dependencies.

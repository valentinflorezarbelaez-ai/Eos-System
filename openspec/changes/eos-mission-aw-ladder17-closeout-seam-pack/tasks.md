# Tasks: Mission AW (SPEC-0054 Ladder 17 CI Seam-Pack Consolidation & Closeout)

- [x] 1. Author OpenSpec specification package (proposal, design, tasks, spec).
- [x] 2. Implement hermetic lock suite `tests/eos-aw-ladder17-seam-pack.test.js` (AW1–AW15).
- [x] 3. Implement idempotent CRLF-safe host patcher `scripts/patch-mission-aw.mjs`.
- [x] 4. Update `.github/workflows/ci.yml` strict-verify and seam-pack jobs.
- [x] 5. Update `package.json` with Ladder 17 scripts and aliases.
- [x] 6. Update `scripts/test-runner.js` `SLIM_SUITE_EXCLUDES` to maintain `SLIM_COUNT ≤ 145`.
- [x] 7. Update `docs/governance/CI_CD_CONTRACT.md` and `scripts/ci/assert-gha-contract.js`.
- [x] 8. Author `docs/releases/EOS_MISSION_AW_LADDER17_SEAM_PACK_2026-09-12.md`.
- [x] 9. Author `docs/releases/EOS_LADDER_17_CLOSEOUT_2026-09-12.md`.
- [x] 10. Execute local verification suite (`test:mission-aw`, `test:ladder17-pack`, `verify:strict`).

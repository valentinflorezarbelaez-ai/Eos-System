# Proposal — Mission C2: CI seam-pack compute-worker

## Why

`package.json` already exposes `npm run test:compute-worker` (unit + fuzz + adversarial). CI GameDay / ROI `seam-pack` does not run it, so worker/custody regressions can land without CI signal. `test:u2` lock is also missing from the pack.

## What (this change only)

1. OpenSpec light folder (proposal + tasks + design + `.openspec.yaml`)
2. Extend `.github/workflows/ci.yml` seam-pack with fail-closed `test:compute-worker` and `test:u2` (keep prior packs; no `continue-on-error`; no soak)
3. `CI_CD_CONTRACT.md` table + C2 note; `assert-gha-contract.js` surface check for `test:compute-worker`
4. TDD `tests/eos-mission-c2-ci-compute-worker.test.js` + `test:c2`; exclude basename from slim discovery to hold TR-01 ≤145; extend GHA-008 + m5 list
5. Commit + push only (NO PR)

## Routing

**SDD** — ZERO vibe coding. Antigravity-first — NO Cursor CloudAgent. NO AI attribution.

## NON-goals

- PRODUCTION_READY flip; Fundacion / Fuerza; PR open/merge; tip refresh; raising slim ceiling; soak; new GH billing; CloudAgent; new schemas JSON; new deps

# Proposal — EOS T2 CI seam-pack L7 locks

## Why

Ladder 8 audit **T2 / K2**: package.json already exposes `test:s2`, `test:s3`, `test:s5`, `test:s6`, `test:specboot-agy`, but CI seam-pack only ran `test:s4` for L7. Locks can regress without CI signal.

## What (this change only)

1. OpenSpec light folder (this proposal + tasks + .openspec.yaml)
2. Extend `.github/workflows/ci.yml` seam-pack with CI-safe L7 scripts
3. `CI_CD_CONTRACT.md` table + T2 note; `assert-gha-contract.js` surface checks
4. TDD `tests/eos-t2-ci-seam-pack-l7.test.js` + `test:t2`; extend GHA-008 + m5 list
5. Evidence + freeze T2 section + matrix MEASURED row

## Routing

**SDD** — ZERO vibe coding. Antigravity-first — NO Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip; Fundacion / Fuerza; PR open/merge; tip refresh; T3+; soak; new GH billing; CloudAgent default; new schemas JSON

# Proposal — EOS U2 CI seam-pack T2–T8 locks

## Why

Ladder 9 audit **U2 / K2**: package.json already exposes `test:t2`…`test:t8`, but CI seam-pack only runs L7 `test:s2`–`s6` + `test:specboot-agy`. L8 locks (T2 meta through T8 DEFER triage) can regress without CI signal.

## What (this change only)

1. OpenSpec light folder (this proposal + tasks + .openspec.yaml)
2. Extend `.github/workflows/ci.yml` seam-pack with CI-safe `test:t2`…`test:t8`
3. `CI_CD_CONTRACT.md` table + U2 note; `assert-gha-contract.js` surface checks
4. TDD `tests/eos-u2-ci-seam-pack-t2-t8.test.js` + `test:u2`; extend GHA-008 + m5 list
5. Evidence + freeze U2 section + matrix MEASURED row

## Routing

**SDD** — ZERO vibe coding. Antigravity-first — NO Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip; Fundacion / Fuerza; PR open/merge; tip refresh; U3+; soak; new GH billing; CloudAgent default; new schemas JSON; staging DEFER dirty

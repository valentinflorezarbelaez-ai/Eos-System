# Proposal — EOS S3 Loop Engineering + 4Q guides/sensors

## Why

Ladder 7 audit **S3 / K3** (post S2 Context Pack TPC @ main `897a50f`): Mission loop MCP (ADR-0014) and computational guides/sensors already exist, but there is **no** canonical **Loop Engineering** policy that states the LIDR cycle **guides→act→sensors→feedback** plus the **four-quadrant** matrix (feedforward/feedback × computational/inferential) mapped onto real EOS surfaces, with doctor/mission honesty NON-CLAIM.

## What (this change only)

1. OpenSpec change folder `openspec/changes/eos-s3-loop-engineering-4q/` (this proposal + design + tasks + delta spec)
2. Canonical SSOT matrix: `docs/harness/LOOP_ENGINEERING_4Q.md`
   - Cycle: guides → act → sensors → feedback
   - 4Q table mapped to existing EOS surfaces (no invented runtimes)
   - NON-CLAIM: Loop Engineering policy ≠ productive autonomy; Loop ≠ verify:strict; doctor ≠ verify
3. ADR-0017 under `docs/architecture/adrs/` pointing at the harness SSOT (do **not** rewrite ADR-0011 / ADR-0014)
4. `scripts/lib/loop-engineering-lock.js` + wire into `verify:strict` (existence + required section needles) — mirror `context-pack-lock`
5. TDD `tests/eos-s3-loop-engineering-4q.test.js` + `package.json` `test:s3`
6. Optional light: doctor NON-CLAIM line — Loop Engineering policy ≠ verify:strict / ≠ productive autonomy
7. Spanish evidence `docs/releases/EOS_S3_LOOP_ENGINEERING_4Q_2026-09-09.md` + freeze note

## Routing

**SDD** (ADR-0010 / docs/base-standards.md). Human requested **ZERO vibe coding** — 100% Spec-Driven Development + Strict TDD.

## NON-goals

- PRODUCTION_READY flip
- Claiming productive autonomy / "whiplash solved" / autonomous loop OS
- Rewriting ADR-0011 or ADR-0014 bodies
- New `docs/schemas/**/*.json` (AT_CEILING 35/35)
- Fundacion / App Fuerza
- Open/merge PR
- Tip refresh (freeze tip stays; S1 already closed tip refresh)
- S4–S6 implementation

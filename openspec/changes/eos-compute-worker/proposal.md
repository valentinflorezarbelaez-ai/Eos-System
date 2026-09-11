# Proposal — EOS Compute Worker (SPEC-0008)

## Why

Phase 2 needs a **headless compute runner** that can consume OpenSpec change task lists, apply bounded builder diffs, and fail-closed when independent verification fails — without vibe coding or CloudAgent.

## What (this change)

1. OpenSpec change envelope for SPEC-0008 (`openspec/changes/eos-compute-worker/`).
2. Headless runner: `scripts/runners/eos-compute-worker.js` (Tier-2 pure orchestration helpers; no `src/core` mutation).
3. Tests: `tests/runners/eos-compute-worker.test.js` — TDD RED→GREEN for:
   - happy path marking `[x]` when verifier passes
   - rollback on verifier breach
   - reject out-of-scope writes
4. Context authority pointer: `docs/harness/CONTEXT_PACK_TPC.md` (read-only reference; not reinvented).
5. Role split: worker = **BUILDER** (diff plan/apply); child `npm test` + `npm run verify:strict` = **VERIFIER**.

## Routing

**SDD** / Antigravity-first / Zero vibe coding.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza
- Cursor CloudAgent
- New JSON schemas (AT_CEILING 35/35)
- Claiming soak / production autonomy

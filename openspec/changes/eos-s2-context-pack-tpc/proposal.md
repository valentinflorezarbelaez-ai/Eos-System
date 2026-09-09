# Proposal — EOS S2 Context Pack TPC index + lifecycle

## Why

Ladder 7 audit **S2 / K2** (post S1 tip refresh #75 @ `aa28b59`): TPC and compaction live in doctrine, but there is **no** canonical Context Pack index nor explicit **context lifecycle** policy (inject / compact / discard / reset; revisit assumptions on model change). LIDR harness blog distinguishes Context *qué* vs Harness *cuándo*.

## What (this change only)

1. OpenSpec change folder `openspec/changes/eos-s2-context-pack-tpc/` (this proposal + design + tasks + delta spec)
2. Canonical SSOT index: `docs/harness/CONTEXT_PACK_TPC.md`
   - Tool / Prompt / Context pillars pointing to **existing** repo surfaces
   - Context lifecycle policy text: inject / compact / discard / reset / revisit-on-model-change
   - Pointers to LIDR adoption doc
   - DEFER/gaps for missing Spec-Boot files (frontend-standards, documentation-standards, development_guide) — **do not invent** full standards content
3. `scripts/lib/context-pack-lock.js` + wire into `verify:strict` (existence + required section needles) — mirror `p6-inventory-lock` pattern
4. TDD `tests/eos-s2-context-pack-tpc.test.js` + `package.json` `test:s2`
5. Spanish evidence `docs/releases/EOS_S2_CONTEXT_PACK_TPC_2026-09-09.md` + freeze note
6. Optional one-line pointer from `AGENTS.md` / `CLAUDE.md` to the index (minimal)

## Routing

**SDD** (ADR-0010 / docs/base-standards.md). Human requested **ZERO vibe coding** — 100% Spec-Driven Development + Strict TDD.

## NON-goals

- PRODUCTION_READY flip
- Full runtime context engineering / live orchestrator (NON-CLAIM: index ≠ runtime context completo)
- Invent missing Spec-Boot standards files
- New `docs/schemas/**/*.json` (AT_CEILING 35/35)
- Fundacion / App Fuerza
- Open/merge PR
- Tip refresh (freeze tip stays; S1 already closed)
- S3–S6 implementation

# Proposal — EOS SpecBoot cycle + Antigravity-first

## Why

Post S4 (#78 @ main `d86ab23`): EOS has SpecBoot skills/commands, OpenSpec, GEMINI/AGENTS Antigravity mentions, and fusion/eos-workstation docs, but **no** single harness SSOT that (1) maps the LIDR SpecBoot cycle to EOS surfaces, (2) declares **Antigravity-first** as the default coding runtime (Cursor CloudAgent out of default path), and (3) makes missing SpecBoot steps discoverable under `.agents/skills` for AGY.

## What (this change only)

1. OpenSpec `openspec/changes/eos-specboot-antigravity-first/`
2. `docs/harness/SPECBOOT_CYCLE.md` — cycle + skill/command map (exists vs DEFER)
3. `docs/harness/ANTIGRAVITY_FIRST.md` — primary runtime Antigravity/Gemini/eos-workstation; CloudAgent demoted; NON-CLAIM not banning local Cursor IDE editing
4. Minimal pointers in CONTEXT_PACK_TPC, AGENTS.md, GEMINI.md, CLAUDE.md
5. Thin `.agents/skills/{ff,propose,apply,verify,archive,commit}/SKILL.md` mirrors pointing at `.cursor/commands/*.md` (and ai-specs commit) — **no huge body fork**
6. `scripts/lib/specboot-cycle-lock.js` + verify:strict wire
7. `tests/eos-specboot-antigravity-first.test.js` + `test:specboot-agy`
8. Spanish evidence + freeze note
9. Thin DEFER stubs for missing Spec-Boot standards docs (left **unstaged**)
10. Optional: `openspec/config.yaml` context mentions SpecBoot + Antigravity-first

## Routing

**SDD** (ADR-0010). Human requested **ZERO vibe coding** — Spec-Driven + Strict TDD. **Antigravity-first** — no Cursor CloudAgent launches.

## NON-goals

- PRODUCTION_READY flip
- Banning local Cursor IDE file editing (demote CloudAgent launches only)
- Duplicating large SpecBoot bodies
- New `docs/schemas/**/*.json` (AT_CEILING)
- Fundacion / App Fuerza
- Open/merge PR
- Tip refresh

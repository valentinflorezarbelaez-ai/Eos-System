# Agent IDE Entrypoints (Phase 2)

**Date:** 2026-09-08
**Status:** ACTIVE (local-governed)
**PRODUCTION_READY:** NO

## Purpose

Eliminate entrypoint drift so Antigravity/Gemini, Cursor, Claude, and Codex hit the **same** operating protocol.

## Canonical sources

| Role | Path |
| --- | --- |
| Full agent protocol (canonical) | `.agents/AGENTS.md` |
| Standards index | `docs/base-standards.md` |
| Constitution | `CONSTITUTION.md`, `docs/core/CONSTITUTION.md` |
| OpenSpec mandatory steps | `docs/openspec-tasks-mandatory-steps.md` |
| MCP SSOT | `docs/mcp/MCP_SSOT.md` + `npm run mcp:sync` |

## Thin root stubs

Root stubs are **pointers only**. They must not restate write-barrier, autonomy, or epistemic taxonomy (those belong exclusively in `.agents/AGENTS.md`).

| Stub | Primary IDE surface |
| --- | --- |
| `AGENTS.md` | Generic / multi-IDE |
| `GEMINI.md` | Gemini / Antigravity |
| `CLAUDE.md` | Claude Code |
| `codex.md` | Codex / Copilot |

## Drift guard

- Script: `scripts/agent-entrypoints-check.js`
- Test: `tests/agent-entrypoints.test.js`
- Fails if a required stub is missing, or if required pointer lines are absent.

## Non-goals

- No `PRODUCTION_READY=YES`
- No merge to `main` in this phase
- No `Fundacion/` changes

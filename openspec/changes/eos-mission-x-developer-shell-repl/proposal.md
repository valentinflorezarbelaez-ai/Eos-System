# Proposal — Mission X: Interactive Developer Shell / REPL (SPEC-0029)

## Why

Mission W delivered a sovereign session coordinator that orchestrates Q/R/S/T/V via injection. Operators still lack a **thin interactive developer shell / REPL** with slash commands (`/start`, `/run`, `/status`, `/close`, `/doctor`, `/help`, `/exit`) and an ANSI/ASCII HUD that drives that coordinator hermetically — without rewriting W, without PRODUCTION_READY pretence, without Fundacion writes, and without claiming to be a Claude Code clone.

## What

1. New module `src/cli/interactive-developer-shell.js` — `createInteractiveDeveloperShell`, kind `eos-developer-shell-repl`, injectable stdin/stdout + Mission W coordinator factory + optional Q/R/S/T/V port factories + doctor port, `DEVELOPER_SHELL_PRODUCTION_READY='NO'`.
2. Thin entrypoint `bin/eos-shell.js` (real stdio wiring).
3. Suite `tests/cli/interactive-developer-shell.test.js` (≥12 cases); slim-exclude basename; `npm run test:developer-shell` / `test:mission-x`.
4. OpenSpec change + release report + bootstrap + package/slim/bin patcher.
5. Prefer **not** mutating Mission W — orchestrate via injection only.

## DoD

Branch `grok/mission-x-developer-shell-repl` from main@911d3ea (warn on mismatch); tests green (≥12 PASS, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host; no AI commit attribution.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- PRODUCTION_READY flip
- Fundacion / App Fuerza mutation
- Cursor CloudAgent
- Claude Code clone / parity claim
- Rewriting Mission W (or Q/R/S/T/V)
- New npm dependencies / JSON schemas
- Raising TR-01 (prefer exclude-from-slim)
- agy-daemon install or AGY DAEMON_PRESENT pretence

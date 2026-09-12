# Mission X — Interactive Developer Shell / REPL (SPEC-0029) — 2026-09-11

## Summary

Thin **interactive developer shell / REPL** with slash commands that orchestrates
Mission W sovereign session coordinator (and optionally Q/R/S/T/V ports) via
injection. Opens a session (`/start`), runs SpecBoot (`/run`) with remediation
HUD lines, renders live status (`/status`), drains + seals EVD (`/close`), and
runs an injectable workspace doctor (`/doctor`). New module
`src/cli/interactive-developer-shell.js` + `bin/eos-shell.js` — **not**
PRODUCTION_READY, **not** a Claude Code clone, **not** a rewrite of Mission W.

## Routing

| Signal | Path |
| --- | --- |
| Lifecycle | `createInteractiveDeveloperShell` → start/run / handleLine / stop / health/getState |
| Ports | Injected Mission W `createSovereignSessionCoordinator` / `coordinatorFactory`; optional worker/sentinel/specboot/remediation/writeGateway factories; injectable `doctor` |
| HUD | Append-only ANSI/ASCII (no flicker); `[Remediation attempt N/M]` |
| AGY / Claude | **NON-CLAIM** — kind=`eos-developer-shell-repl`; ≠ Claude Code clone |
| Mission W | Consumes via injection; does not rewrite sovereign-session-coordinator.js |
| ATS | Non-claim |

## Shell states

`IDLE → READY → SESSION_OPEN → RUNNING_CHANGE → SESSION_OPEN → CLOSING → READY | STOPPED | ERROR`

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/cli/interactive-developer-shell.js` | **NEW** |
| `bin/eos-shell.js` | **NEW** |
| `tests/cli/interactive-developer-shell.test.js` | **NEW** |
| Mission W module | **No** (not rewritten) |
| `package.json` / `scripts/test-runner.js` | scripts + bin + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |

## Verification (box harness)

```
cd /workspace/Eos-mission-x-payload && node --test tests/cli/interactive-developer-shell.test.js
```

→ **17 PASS**, 0 SKIP, 0 FAIL

Slim exclude `interactive-developer-shell.test.js` + `npm run test:developer-shell` / `test:mission-x`.

## Cases

| ID | Result |
| --- | --- |
| X1 /help and /exit | PASS |
| X2 /start opens session | PASS |
| X3 /run triggers SpecBoot | PASS |
| X4 /status renders HUD | PASS |
| X5 /close seals EVD | PASS |
| X6 /doctor injectable | PASS |
| X7 remediation HUD line | PASS |
| X8 unknown command fail-closed | PASS |
| X9 /run without /start fail-closed | PASS |
| X10 /quit alias | PASS |
| X11 kind + PRODUCTION_READY | PASS |
| X12 ANSI / state transition render | PASS |
| X13 /close without session | PASS |
| X14 /start missing changeId | PASS |
| X15 createSovereignSessionCoordinator injection | PASS |
| X16 stream + NON-CLAIM source | PASS |
| X17 run() alias + default doctor | PASS |

## Package scripts (exact)

```json
"test:developer-shell": "node --test tests/cli/interactive-developer-shell.test.js",
"test:mission-x": "node --test tests/cli/interactive-developer-shell.test.js"
```

Optional bin:

```json
"bin": { "eos-shell": "bin/eos-shell.js" }
```

(`eos shell` alias may be wired via host mission-cli separately; see PACKAGE_SCRIPTS_NOTE.)

SLIM_SUITE_EXCLUDES entry: `'interactive-developer-shell.test.js'`

Applied on host by `scripts/patch-mission-x.mjs` (idempotent).

## Public API

```js
createInteractiveDeveloperShell(options) → {
  start(), run(), handleLine(line), stop(), getState(), health(),
  kind: 'eos-developer-shell-repl', PRODUCTION_READY: 'NO'
}
```

Helpers: `formatHudLine`, `formatRemediationLine`, `formatTransitionLine`.

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)
- Base tip Expected: `911d3ea` (Mission W on main)
- No AI commit attribution / no Co-Authored-By
- **NON-CLAIM:** ≠ Claude Code clone; ≠ rewrite of Mission W — injection only
- No Cursor CloudAgent

## Branch

`grok/mission-x-developer-shell-repl`

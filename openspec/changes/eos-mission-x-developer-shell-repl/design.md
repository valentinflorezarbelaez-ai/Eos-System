# Design — Mission X (SPEC-0029)

## Architecture

```
createInteractiveDeveloperShell({
  stdin|input, stdout|output,   // injectable streams (PassThrough in tests)
  createSovereignSessionCoordinator?,  // Mission W factory
  coordinatorFactory?,                 // () => pre-built coordinator
  createWorkerDaemon? / createSentinel? / createSpecboot? /
    createRemediation? / createWriteGateway?,  // optional port factories
  doctor?, color?, maxRemediationAttempts=3, now?
})
  start() / run()     → READY (attach stdin)
  handleLine(line)    → slash command dispatch
  stop()              → STOPPED
  getState() / health()

Slash:
  /start <changeId> → build coordinator → openSession → SESSION_OPEN
  /run              → require session → runChange (+ remediation HUD)
  /status           → ANSI/ASCII HUD (append-only, no flicker)
  /close            → closeSession/seal → EVD → READY
  /doctor           → injectable doctor (default hermetic)
  /help /exit /quit
```

## Shell states

`IDLE → READY → SESSION_OPEN → RUNNING_CHANGE → SESSION_OPEN → CLOSING → READY | STOPPED | ERROR`

## Fail-closed

- Unknown command → error line (`SHELL_UNKNOWN_COMMAND`)
- `/run` or `/close` without `/start` → `SHELL_NO_SESSION`
- Missing coordinator factory → `SHELL_DEPENDENCY`
- Never touches Fundacion (Δ=0)

## HUD

Append-only ANSI/ASCII lines (no clear-screen flicker):
- state transition: `→ FROM → TO`
- status: `[EOS-SHELL] STATE sess=… id=… change=… ports=WSBRG`
- remediation: `[Remediation attempt 1/3]`

## Honesty

- ≠ Claude Code clone
- ≠ rewriting Mission W (consumes via injection)
- PRODUCTION_READY remains `'NO'`
- Fundacion Δ=0
- No CloudAgent

## Non-goals

No PRODUCTION_READY flip. No Fundacion writes. No CloudAgent. No TR-01 raise.

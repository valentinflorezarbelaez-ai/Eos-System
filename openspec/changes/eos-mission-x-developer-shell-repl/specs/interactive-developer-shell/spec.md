# Spec — interactive-developer-shell (SPEC-0029)

## Requirement: Interactive developer shell lifecycle

The system SHALL expose an interactive developer shell / REPL with states
IDLE | READY | SESSION_OPEN | RUNNING_CHANGE | CLOSING | STOPPED | ERROR.
Public API SHALL include `start()`, `run()`, `handleLine(line)`, `stop()`,
`getState()`, and `health()`. Stdin/stdout (or input/output) SHALL be
injectable for hermetic tests. Kind SHALL equal `eos-developer-shell-repl`.
`DEVELOPER_SHELL_PRODUCTION_READY` SHALL equal `'NO'`.

### Scenario: Help and exit

- GIVEN a started shell
- WHEN /help then /exit
- THEN help lists slash commands and state becomes STOPPED

### Scenario: Start opens sovereign session

- GIVEN an injected Mission W coordinator factory
- WHEN /start &lt;changeId&gt;
- THEN coordinator.openSession is invoked and shell state is SESSION_OPEN

## Requirement: Slash command orchestration of Mission W

`/run` SHALL call coordinator.runChange for the active changeId.
`/close` SHALL call closeSession/seal and surface sealed EVD sha256 custody.
`/status` SHALL render an append-only ANSI/ASCII HUD (no flicker).
`/doctor` SHALL use an injectable doctor port (default hermetic, Fundacion Δ=0).

### Scenario: Run triggers SpecBoot

- GIVEN an open session
- WHEN /run
- THEN coordinator.runChange was called once and result ok

### Scenario: Close seals EVD

- GIVEN an open session after /run
- WHEN /close
- THEN sealedEvd.sha256 matches /^[a-f0-9]{64}$/ and custody.algorithm is sha256

### Scenario: Remediation HUD line

- GIVEN a coordinator that remediates
- WHEN /run
- THEN output includes `[Remediation attempt 1/3]` (and further attempts when reported)

## Requirement: Fail-closed

Unknown commands SHALL emit an error line. `/run` and `/close` without an
open session SHALL refuse with `SHELL_NO_SESSION`. The shell SHALL never
touch Fundacion. Missing coordinator factory SHALL fail-closed.

### Scenario: Run without start

- GIVEN a started shell with no session
- WHEN /run
- THEN ok=false and code is SHELL_NO_SESSION

### Scenario: Unknown command

- GIVEN a started shell
- WHEN /nope
- THEN ok=false and code is SHELL_UNKNOWN_COMMAND

## Requirement: NON-CLAIM honesty

The shell SHALL NOT claim to be a Claude Code clone, SHALL NOT flip
PRODUCTION_READY, SHALL NOT claim CloudAgent or AGY DAEMON_PRESENT, and
SHALL orchestrate Mission W via injection only (no rewrite of
sovereign-session-coordinator.js).

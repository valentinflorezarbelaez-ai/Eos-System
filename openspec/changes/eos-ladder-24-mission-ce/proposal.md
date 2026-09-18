# Proposal — Mission CE Sovereign Operator Reality Console Port (SPEC-0088)

## Why

Ladder 24 axis **Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric** needs a Layer-0 aggregated epistemic console that surfaces MEASURED vs UNKNOWN vs BLOCKED across ladders for the operator without Fundacion bleed. HUD fragments exist; EOS lacks the console port (`CE-RCPT-*`).

## What changes

- New Layer-0 modules under `src/core/observability/`:
  - `operator-reality-console-receipt.js` — sealed `CE-RCPT-*` receipts
  - `operator-reality-console-policy-gate.js` — fail-closed console preconditions
  - `operator-reality-console-port.js` — facade (`snapshot`, `verifyTrail`, `getSnapshot`)
- Hermetic tests `tests/eos-ce-operator-reality-console-port.test.js`
- CRLF-safe patcher `scripts/patch-mission-ce.mjs` (scripts + SLIM exclude)
- OpenSpec change, ADR-0048, evidence, release notes

## Non-goals

- PRODUCTION_READY flip
- Fundacion writes
- Full SIEM/APM / production ops center claims
- CF implementation
- Tip-refresh / freeze tip rewrite
- Reopening L17–L23
- Breaking existing HUD fragment surfaces

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| L17–L23 | CLOSED_FOR_LOCAL_GOVERNED_USE — never reopen |
| L24 | OPEN (Audit + CB+CC+CD MEASURED · CE in progress · CF pending) |
| Axis | Sovereign Cross-Ladder Composition, Mission Economics & Fleet Operator Fabric |
| Antigravity-first | yes |
| Mode | Hermetic Layer-0 console port (no network/SIEM) |

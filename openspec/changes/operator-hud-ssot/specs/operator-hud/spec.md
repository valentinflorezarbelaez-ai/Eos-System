# Operator HUD

Capability: a single operator-facing status metric that prefers this-run measurement over historical slogans.

## Requirements

### Requirement: Live verify counts are measured this run

The HUD SHALL report `verify-eos --strict` pass/fail counts from the report produced in this invocation (or an injected equivalent in tests). It MUST NOT hardcode historical check totals as live truth.

#### Scenario: Injected verify report is the SSOT

- GIVEN a verify report with 12 passed checks and 1 failure
- WHEN the HUD aggregator collects status
- THEN the panel shows passed=12 failed=1 with epistemic `VERIFIED` and does not print `1440 tests` or `482 checks`

### Requirement: File readiness is observed, not invented

`PRODUCTION_READY` and `COMPLETE_FOR_LOCAL_GOVERNED_USE` SHALL be copied from named files and labeled `OBSERVED` with a source path.

#### Scenario: Mission dictamen is observed

- GIVEN `CURRENT_MISSION.json` with `dictamen.PRODUCTION_READY` = `NO`
- WHEN the HUD renders readiness
- THEN the line is `OBSERVED` and cites `EOS-MISSION-CONTROL/CURRENT_MISSION.json`

### Requirement: Stale unattributed slogans are refused

The renderer MUST throw or refuse if asked to echo `1440 tests` or `482 checks` without a source path on the same line.

#### Scenario: Unattributed stale count is refused

- GIVEN a HUD text fragment containing `1440 tests` and no `source:`
- WHEN honesty assertion runs
- THEN the claim is refused (`STALE_CLAIM_REFUSED`)

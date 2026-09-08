# Engine ROI2 quarantine — REVERSIBLE

**Date:** 2026-09-08 (America/Bogota)  
**Branch intent:** `cursor/roi2-engine-prune`  
**Action:** moved (not deleted) from `scripts/engine/` + companion `tests/*`  

## Why

Mission OS (`src/core`) is canonical. `scripts/engine` retained a large research/canary surface that is not required by:

- `verify:strict` required-file gates
- MCP mission bridge / write-barrier / entrypoints
- CI governance package scripts (`evaluate:release`, `verify:independent`, `audit:system`, …)

## Canonical keep set (19)

- `scripts/engine/adversarial-laboratory-engine.js`
- `scripts/engine/autonomous-engineering-factory.js`
- `scripts/engine/autonomous-engineering-mission-engine.js`
- `scripts/engine/autonomous-engineering-operating-loop.js`
- `scripts/engine/autonomous-execution-runtime.js`
- `scripts/engine/autonomous-self-evolution-engine.js`
- `scripts/engine/capability-intelligence-engine.js`
- `scripts/engine/independent-verification-harness.js`
- `scripts/engine/mission-ledger.js`
- `scripts/engine/production-readiness-review.js`
- `scripts/engine/real-project-discovery-engine.js`
- `scripts/engine/release-decision-engine.js`
- `scripts/engine/simulate-strategies.js`
- `scripts/engine/spec-driven-product-loop.js`
- `scripts/engine/strategy-engine.js`
- `scripts/engine/strategy-selection-engine.js`
- `scripts/engine/strategy-simulator.js`
- `scripts/engine/system-wide-integrity-audit.js`
- `scripts/engine/x-learning-watch.js`

## Archived here

- Engines: `archive/quarantine/engine-roi2/scripts-engine/` (80 files)
- Tests: `archive/quarantine/engine-roi2/tests/` (88 files)
- Machine inventory: `INVENTORY.json`

## Restore

Move a file back to `scripts/engine/` (and its test back under `tests/`) if a consumer is reintroduced. Update `tests/engine-roi2-canonical-inventory.test.js` keep list accordingly.

## Non-goals

- No Fundacion changes
- PRODUCTION_READY remains NO
- No ROI3+

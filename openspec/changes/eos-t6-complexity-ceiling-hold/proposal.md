# Proposal — EOS T6 Complexity ceiling hold / named prune gate

## Why

Ladder 8 audit **T6 / K6**: schemas 35/35 AT_CEILING; R4/R6 closed the verify gate; P6 inventory unused islands remain. Next maturity is a **standing order** to hold the ceiling (no new schemas) **or** a PO-named schema/engine prune from the P6 inventory. Prefer HOLD unless PO names exact paths. Vibe schemas are FORBIDDEN.

## What (this change only)

1. OpenSpec light (this proposal + design + tasks + .openspec.yaml)
2. Harness runbook `docs/harness/COMPLEXITY_CEILING_HOLD_RITUAL.md` — HOLD | PO_NAMED modes
3. Decision **HOLD** evidence `docs/releases/EOS_T6_COMPLEXITY_CEILING_HOLD_2026-09-09.md` (standing order hold AT_CEILING; PO has not named prune paths)
4. Verify lock `scripts/lib/complexity-ceiling-hold-lock.js` + CI gate `scripts/ci/complexity-ceiling-hold-gate.js` (validates HOLD or PO_NAMED list; never prunes; re-audits R4 complexity-budget-lock)
5. TDD `test:t6`; wire verify-eos 3g17 + REQUIRED_PATHS
6. Freeze T6 + matrix MEASURED
7. NON-CLAIM: HOLD ≠ executed prune; inventory ≠ quarantine; gate ≠ budget bump; no vibe schemas

## Routing

**SDD** — ZERO vibe coding. Antigravity-first — NO Cursor CloudAgent.

## NON-goals

- Executed schema/engine prune / silent quarantine
- Raising max_schemas without PO
- PRODUCTION_READY flip; Fundacion / Fuerza; PR open/merge; tip refresh; T7+; CloudAgent default; reimplement R4 lock

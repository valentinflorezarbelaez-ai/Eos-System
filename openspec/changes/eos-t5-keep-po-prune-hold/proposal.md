# Proposal — EOS T5 KEEP PO-named prune hold / gate

## Why

Ladder 8 audit **T5 / K4**: S5 published KEEP 57 / CANDIDATE 23 with **zero** prune (correct). Next maturity is a PO ritual: named-list prune + catalog reconcile fail-closed, **or** an explicit documented HOLD ("no prune this quarter"). Silent delete is FORBIDDEN.

## What (this change only)

1. OpenSpec light (this proposal + design + tasks + .openspec.yaml)
2. Harness runbook `docs/harness/KEEP_PO_PRUNE_RITUAL.md` — PO-named gate/process only
3. Decision **HOLD** evidence `docs/releases/EOS_T5_KEEP_PO_PRUNE_HOLD_2026-09-09.md` (PO has not named tools)
4. Verify lock `scripts/lib/keep-po-prune-hold-lock.js` + CI gate `scripts/ci/keep-po-prune-gate.js` (validates HOLD or PO_NAMED list; never deletes)
5. TDD `test:t5`; wire verify-eos 3g16 + REQUIRED_PATHS
6. Freeze T5 + matrix MEASURED; TR-01 ceiling bump for intentional Ladder8 suite
7. NON-CLAIM: inventory ≠ silent delete; HOLD ≠ executed prune; catalog remains 80 under HOLD

## Routing

**SDD** — ZERO vibe coding. Antigravity-first — NO Cursor CloudAgent.

## NON-goals

- Executed MCP/tool prune / silent catalog delete
- PRODUCTION_READY flip; Fundacion / Fuerza; PR open/merge; tip refresh; T6+; CloudAgent default; new schemas JSON

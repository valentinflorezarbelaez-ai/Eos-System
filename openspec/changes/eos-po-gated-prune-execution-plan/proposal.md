# Proposal — EOS PO-Gated Complexity Prune Execution Plan (docs-only)

Post-L26 inventory A (ADR-0062; 68 rows; dispositions retain|merge|archive|delete-later) classifies complexity surface but **does not authorize** quarantine, archive, or delete. Ladder 28 audit (ADR-0074) deferred prune to a **PO-gated plan** and rejected prune as sole L28 axis. This change publishes that plan — still docs-only.

## Why

Valentin (PO) needs a Level-2 authorize-able, risk-ordered execution plan with named-path checkbox tables so a *future* execute workstream can act only on Y-authorized rows after verify:strict + import re-scan — without treating inventory as delete auth.

## What changes

- `docs/releases/EOS_PO_GATED_PRUNE_EXECUTION_PLAN_2026-09-19.md` — purpose, NON-CLAIMS, preconditions, Batches 0–4, PO auth template, stop/never-touch
- `docs/adrs/ADR-0075-po-gated-complexity-prune-execution-plan.md`
- `docs/evidence/EOS_PO_GATED_PRUNE_PLAN_EVD_2026-09-19.md`
- OpenSpec change `eos-po-gated-prune-execution-plan`

## Non-goals

- Any delete / quarantine / archive / move execution
- Mission CV–CZ implementation or L28 OPEN claim
- Tip-refresh / freeze-matrix rewrite
- PRODUCTION_READY flip; Fundacion writes; new schemas JSON
- Reopen L17–L27

## Governance

| Item | Value |
| --- | --- |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 ALWAYS_DENY |
| Schemas | AT_CEILING 35/35 |
| L17–L27 | CLOSED — never reopen |
| Scope | Outside L28 CV–CZ; NOT Mission CV |
| Human authority | PO Level-2 named paths required before any future execute |

# Tasks — eos-po-gated-prune-execution-plan (DAG)

Docs-only. ZERO deletes / quarantine moves / archive execution. Outside L28 CV–CZ. Host apply / PR are post-payload gates. PO auth fill is human, post-land.

## T0 — Payload scaffold
- **depends-on:** (none)
- **done-criteria:** `/workspace/eos-po-gated-prune-plan/` exists with docs/ + openspec/; APPLY + RESULT + READY markers; no src/ tree; no schema JSON.
- **status:** [x]

## T1 — Execution plan document
- **depends-on:** T0
- **done-criteria:** `docs/releases/EOS_PO_GATED_PRUNE_EXECUTION_PLAN_2026-09-19.md` with purpose, NON-CLAIMS, preconditions, Batches 0–4, PO auth checkbox tables, stop/never-touch; inventory row IDs bound; plan ≠ execution.
- **status:** [x]

## T2 — ADR-0075
- **depends-on:** T0
- **done-criteria:** `docs/adrs/ADR-0075-po-gated-complexity-prune-execution-plan.md` records plan-only decision, non-decisions, never-reopen L17–L27, outside CV–CZ.
- **status:** [x]

## T3 — OpenSpec envelope
- **depends-on:** T0
- **done-criteria:** `.openspec.yaml`, `proposal.md`, `design.md` declare non-goals (no execute; no CV; no tip rewrite; AT_CEILING; Fundacion Δ=0).
- **status:** [x]

## T4 — Spec stub + tasks
- **depends-on:** T3
- **done-criteria:** `tasks.md` + `specs/po-gated-prune-execution-plan/spec.md` with invariants + NON-CLAIM fence.
- **status:** [x]

## T5 — Evidence note
- **depends-on:** T1
- **done-criteria:** `docs/evidence/EOS_PO_GATED_PRUNE_PLAN_EVD_2026-09-19.md` pins sources, tip cite-only, batch authorize-able counts, zero-delete check.
- **status:** [x]

## T6 — APPLY + RESULT + READY
- **depends-on:** T1, T2, T3, T4, T5
- **done-criteria:** `APPLY-PO-GATED-PRUNE-PLAN.txt` + `RESULT.json` + `PO_GATED_PRUNE_PLAN_READY`; status `PO_GATED_PRUNE_PLAN_READY`; sha256 of package files; checks docs-only / zero deletes / no tip refresh / no git push / outside CV–CZ.
- **status:** [x]

## T7 — Host CopyFromBox + docs-only PR (host-only)
- **depends-on:** T6 (parent)
- **done-criteria:** Parent copies docs/adrs/openspec/evidence; `npm run verify:strict` green; docs-only PR. **Not executed on box.**
- **status:** [ ] host

## T8 — PO Level-2 authorization fill (human)
- **depends-on:** T7
- **done-criteria:** PO completes Y/N + initials + date on authorize-able rows; blanks remain N.
- **status:** [ ] PO

## T9 — Separate execute workstream (NOT this change)
- **depends-on:** T8 + Batch 0 dry-run
- **done-criteria:** Separate OpenSpec/APPLY executes only Y-named paths with fresh import re-scan; this package remains plan-only.
- **status:** [ ] separate change

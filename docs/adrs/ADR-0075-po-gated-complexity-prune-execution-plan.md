# ADR-0075: PO-Gated Complexity Prune Execution Plan (docs-only)

- **Status:** Accepted (plan-only; **no delete / quarantine / archive execution**)
- **Date:** 2026-09-19
- **Owner / PO:** Valentin Florez
- **Supersedes:** none
- **Extends:** ADR-0062 (post-L26 complexity prune inventory) · ADR-0059 (post-L26 perfection backlog)
- **Related:** P6 inventory 2026-09-09 · Q4/Q6 complexity ceiling locks · Ladder 28 audit ADR-0074 (deferred prune; **this plan is outside CV–CZ**)

## Context

Post-L26 Workstream A published a 68-row complexity prune **inventory** (ADR-0062) with dispositions `retain|merge|archive|delete-later`. Inventory explicitly does **not** authorize execution. Ladder 28 maturity audit (ADR-0074) deferred prune to a **PO-gated plan after audit** and rejected prune as sole L28 axis. Valentin requires an authorize-able, risk-ordered execution **plan** with Level-2 named-path authorization — still without performing deletes.

## Decision

1. Publish `docs/releases/EOS_PO_GATED_PRUNE_EXECUTION_PLAN_2026-09-19.md` as the PO-gated prune **plan** SSOT candidate.
2. Authorize **planning and PO checkbox authorization templates only**.
3. Order proposed work into Batch 0 (dry-run) → Batch 1 (lowest-risk delete-later / pilot + archive/quarantine src-core) → Batch 2 (orphan scripts) → Batch 3 (docs/apply proliferation) → Batch 4 (KEEP/governance retain).
4. Require preconditions: tip honesty (cite-only), `verify:strict` green, PO Level-2 named paths (Y + initials + date), host import re-scan, never-touch list.
5. **Do not** delete, move, quarantine, or archive any host/box path under this ADR.
6. **Do not** claim this work is Mission CV, Ladder 28 satellite work, tip-refresh, or freeze/matrix rewrite.
7. Keep schemas AT_CEILING 35/35; no new `docs/schemas/**/*.json`.
8. Keep PRODUCTION_READY=NO; Fundacion Δ=0; never reopen L17–L27.

## Non-decisions

- No authorization to execute prune/quarantine/archive/delete (even for rows marked delete-later).
- No mass-delete of host `true_orphans` or `patch-mission-*.mjs` without PO-named cohort.
- No weakening of fusion-cp / sentinel-fdir / doctor / hud / write-barrier KEEP edges.
- No L28 OPEN claim; no Mission CV start; no tip-open.
- No ROI2 quarantine re-prune.
- No replacement of ADR-0062 inventory; plan consumes inventory rows by ID.

## Consequences

- PO has a checkbox table to authorize named rows later.
- Future execute workstream must be a **separate** OpenSpec/APPLY with only Y-authorized rows + fresh evidence.
- Risk ordering reduces chance of touching KEEP / Fundacion / freeze SSOT first.
- Epistemic honesty: plan ≠ execution; inventory ≠ auth.

## Acceptance

- Execution plan present with purpose, NON-CLAIMS, preconditions, Batches 0–4, PO auth template, stop/never-touch.
- Evidence note lists sources + batch authorize-able counts.
- OpenSpec change `eos-po-gated-prune-execution-plan` present.
- RESULT.json status `PO_GATED_PRUNE_PLAN_READY`.
- Zero file deletions / quarantine moves / archive executions performed by this package.

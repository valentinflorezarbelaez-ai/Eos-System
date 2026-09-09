# Proposal — EOS R6 complexity-budget verify closeout

## Why

Ladder 6 audit **K6** asked for a verify:strict candado that fails closed if COMPLEXITY_BUDGET `status` / `current_usage.schemas` / `counting_rule` diverge from the filesystem under the locked recursive rule, plus NON-CLAIM candado ≠ executed prune.

**Honest status:** that DoD core was **already implemented in R4** via `scripts/lib/complexity-budget-lock.js` (`auditComplexityBudgetLock`) wired into `scripts/verify-eos.js` block **3g9**. Reimplementing or duplicating the lock would be theater. R6 must not reimplement the lock.

R6 residual gaps (this change):
1. OpenSpec honesty: document **K6 CLOSED_BY_R4**.
2. CI seam-pack does **not** yet run `test:r4` / `test:r5` — Ladder 6 locks can regress without CI signal (mirror R2/Q2).
3. Meta-tests + Spanish evidence + freeze note that Ladder 6 R1–R6 close is pending this merge.

## What

1. OpenSpec change `openspec/changes/eos-r6-complexity-budget-verify-closeout/` stating K6 CLOSED_BY_R4; R6 seals CI + meta-tests + NON-CLAIM.
2. Extend CI seam-pack with **`test:r4`** and **`test:r5`** (both CI-safe / fast); update CI_CD_CONTRACT + assert-gha-contract + m5/GHA/R2 mirrors.
3. `tests/eos-r6-complexity-budget-verify-closeout.test.js` + `test:r6`: assert verify-eos imports/wires `auditComplexityBudgetLock` / complexity-budget-lock; assert CI/contract lists test:r4 (+ r5); NON-CLAIM candado ≠ prune.
4. Spanish evidence `docs/releases/EOS_R6_COMPLEXITY_BUDGET_VERIFY_CLOSEOUT_2026-09-09.md` + freeze note (Ladder 6 R1–R6 close pending merge).
5. Optional doctor/fusion-light for complexity-budget-lock: **SKIP** (would bloat without evidence need; R4 NON-CLAIM doctor ≠ verify).

## Routing

**SDD** (ADR-0010 / docs/base-standards.md). Human requested Spec-Driven Development + Strict TDD. Residual CI/meta-test governance — not DIRECT.

## NON-goals

- Do **not** reimplement or duplicate `complexity-budget-lock.js` / `auditComplexityBudgetLock`
- Do **not** raise `max_schemas`
- Do **not** execute P6 prune
- Fundacion Δ=0; App Fuerza untouched; PRODUCTION_READY=NO
- No new root npm dependencies
- No doctor/fusion-light changes in R6

## Approach

OpenSpec → RED meta-tests (CI missing test:r4/r5) → GREEN CI/contract/assert/m5/GHA + test:r6 → evidence → commit/push (no PR merge).


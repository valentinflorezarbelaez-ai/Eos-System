# OPENSPEC CHANGE DELTA: CRITICAL-PATH PERFORMANCE BUDGET GATE (CHANGE-036)

- **Status**: APPLIED_AND_VERIFIED
- **Authorization Level**: LEVEL_3_PRODUCTION_AUTHORIZED
- **Impacted Specifications**: `SPEC-032-BIG-TECH-HYPER-OPTIMIZATION.md` (FR-094, BDD-082)
- **Owner Squad**: `user:valentin-florez-arbelaez`

## 1. Rationale

CHANGE-035 fixed the SAST surface so the estate stops producing phantom red gates. The remaining
structural risk is the mirror image: **performance regressions that pass every functional test**.
CHANGE-035 itself was only auditable because the operations were fast enough to measure; nothing in
the pipeline prevented a future change from turning a 50 ms audit into a 5 s audit while staying green.

Google (Borg/SRE performance budgets), Netflix (PerfCI) and Meta (performance regression detection)
all enforce *budgets in the pipeline*, not in a wiki.

## 2. Change

- **New Layer-0 module** `src/core/eosPerfBudgetGate.ts`:
  - `DEFAULT_PERF_BUDGETS` declares the critical-path bounds for the control plane.
  - `percentile()` / `median()` — nearest-rank, deterministic, non-mutating.
  - `evaluateSample()` — pure PASS/BREACH decision with headroom ratio.
  - `EosPerfBudgetGate.measure()` — warm-up pass + N timed passes (`process.hrtime.bigint()`).
  - `runDefaultSuite()` — measures audit, fingerprint, source enumeration and turbo pipeline, then
    seals a SHA-256 Merkle receipt over canonical telemetry.
  - `writeEvidence()` — persists `docs/evidence/PERF-BUDGET.json`.
- **New gate script** `scripts/verify-perf-budget.mjs` (fail-closed: `exit 1` on any breach).
- **Pipeline**: wired as *Stage 4.5/7* in `scripts/verify-cicd-pipeline.mjs`.
- **DX**: `npm run perf`, `npm run verify:perf`, `npm run test:perf`, and `eos perf` (CLI).
- **CI runner calibration**: `EOS_PERF_BUDGET_FACTOR` scales every budget (default `1`).

## 3. Declared Budgets (4 vCPU baseline, ~4-8x headroom observed)

| Target | Budget | Observed median | Headroom |
|---|---|---|---|
| `repository_audit` | 400 ms | ~50 ms | ~8x |
| `polyglot_fingerprint` | 150 ms | ~5 ms | ~30x |
| `source_enumeration` | 150 ms | ~6 ms | ~26x |
| `turbo_pipeline` | 1200 ms | ~19 ms | ~64x |

## 4. Verification Evidence

- `test/eosPerfBudgetGate.test.mjs` — 11 tests: statistics determinism, factor scaling, fail-closed
  breach on a deliberately slow operation, rejection of unwired targets, sealed evidence round-trip.
- `node scripts/verify-perf-budget.mjs` → 4/4 PASS, receipt sealed.
- `EOS_PERF_BUDGET_FACTOR=0.001 node scripts/verify-perf-budget.mjs` → exit 1 with 4 BREACH lines
  (proves the gate is fail-closed, not advisory).
- `npm test` → 8 gated stages (1, 2, 3, 3.5, 4, 4.5, 5, 6, 7) passed, deployment authorized.

# Archive Report: eos-real-provider-execution

- **Change**: `eos-real-provider-execution`
- **Archived on**: 2026-09-18
- **Archived to**: `openspec/changes/archive/2026-09-18-eos-real-provider-execution/`
- **Phase**: SDD archive (closing the cycle; not a production release)
- **Archive mode**: hybrid (OpenSpec filesystem + Engram observation)

## Verdict

**PASS WITH WARNINGS** (machine-admitted by `gentle-ai sdd-verify-validate`; evidence revision sha256 `76c75bdabf03bccbac521125cbed34526073225a81d6b8dbce3e49e8b797ffa6`).

- Specification compliance at close: **7/7 requirements, 11/11 scenarios COMPLIANT**.
- Final verification warnings resolved before archive:
  - **C1 (archive-blocking at verify time)** — spec scenario R5-S1 "Injection flags preserved" had no passing covering test. Closed by remediation commit `d190f49` (`test(providers): cover injection-flags simulation contract (C1)`): 5 zero-network tests covering the `forzarFallo*` injection-flags contract at router and MCP level, added to `tests/eos-rp-real-provider-execution.test.js`. Re-verified at close: the scenario is covered.
  - **W2 (apply-progress overclaim)** — slice 2 approval-tests claimed `forzarFallo*` was "covered by existing suites"; no existing suite referenced the flags. The documentation-accuracy gap was corrected in `apply-progress.md`; byte-identical preservation of the legacy `enrutarMision` path was always true (verified by diff).

## Gates at Close

| Gate | Result |
|---|---|
| `npm run test:core` | ✅ 20/20 |
| `npm run test:real-provider` | ✅ 80/80 |
| `node --test tests/eos-rp-real-provider-execution.test.js` | ✅ 58/58 |
| `npm run verify:strict` | ✅ 914 checks / 0 failures |

## Task Completion

**16/16 tasks complete** (3 slices + C1 remediation). The archived `tasks.md` carries all checkbox marks (`[x]`) with per-task TDD evidence: Phase 1 (6 tasks, PR 1), Phase 2 (5 tasks, PR 2), Phase 3 (5 tasks, PR 3). No unchecked implementation tasks remain — the Task Completion Gate passed without exceptional reconciliation.

Note on provenance: the authoritative persisted artifacts (checked `tasks.md`, `apply-progress.md`, `verify-report.md`) live on the PR-chain branches (`feat/rpe/*`), whose tip is commit `d190f49`. A stale pre-apply copy of the change envelope exists as an untracked directory in the main checkout; it was NOT archived. This archive was assembled from the final-state tree `d190f49` (byte-verified, see Mechanical Copy Contract below).

## Delivery State (HITL, outside archive scope)

3 chained PRs are OPEN on tracker `feature/eos-real-provider-execution`; merging is human-in-the-loop and was NOT performed by this phase:

| PR | Slice | Head → Base |
|---|---|---|
| #322 | 1 — OpenRouterAdapter, registry routing map, env-gate allowlist | `feat/rpe/1-adapter-registry` → tracker |
| #323 | 2 — real dispatch path, ECR budget gate, health probe | `feat/rpe/2-dispatch` → `feat/rpe/1-adapter-registry` |
| #324 | 3 — MCP provider tools to real dispatch + C1 remediation `d190f49` | `feat/rpe/3-mcp` → `feat/rpe/2-dispatch` |

The archive commit was placed on the tracker branch (on top of envelope `bc3f114`) so it trails the open chain and rides into `main` when the human merges the chain. The implementation worktree `.worktrees/feature-eos-real-provider-execution` was intentionally kept (PR chain still open).

## Decisions Recorded

- **Size exception accepted chain-wide**: tasks forecast ~395 changed lines for slice 1; actual ~920 (test breadth per threat matrix, 34 tests; no behavior gold-plated). Documented in `apply-progress.md`; accepted for the chain (800-line budget context).
- **Delivery strategy — feature-branch-chain**: 3 sequential slices (adapter+registry → router+probe → MCP+tests), each PR targeting the previous branch, tracker `feature/eos-real-provider-execution` as final destination.
- **Law VI credential path**: provider keys acquired via the Law VI secret broker (`resolveSecret`/`injectToAdapter`); `env-gate.js` allowlists extended with NAMES only (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`; adapters `adapter-gemini`, `adapter-openrouter`); keys never serialized or logged; AU redaction covers outbound payloads.
- **`PRODUCTION_READY` stays `NO`** — real execution is additive and fail-closed; production release remains out of scope (SSOT default stays `fake`).

## Known Pre-Existing Environment Warnings (NOT blockers)

Documented, proven not introduced by this diff:

- Full `npm test` on Windows nested worktrees reports `tests/eos-worktree.test.js` MAX_PATH failure — byte-identical failure vs `main`; passes 4/4 from the shallower main checkout (path-depth dependent, not code-dependent).
- Discovery-walk TOCTOU flake (`TR-03`/`TR-05`) is intermittent in the full discovery suite.
- Full-suite count at close on the nested worktree: 1268/1269 with only the MAX_PATH failure above (per `verify-report`; the environment-contrast proof is recorded there).

## Rules and Gates Applied

- **`openspec/config.yaml` `rules.archive.guidance`**: OpenSpec artifacts were updated after apply (checked tasks, apply-progress, verify-report) — satisfied; archive is not a release — merging remains HITL/write-barrier (recorded above).
- **Native Review Receipt Gate**: no `reviewGate` was present in the structured status for this candidate; archive proceeds under ordinary repository policy (no receipt was discovered to read or block on).
- **Task Completion Gate**: passed — archived `tasks.md` has 16/16 checked, 0 unchecked.
- **CRITICAL verification issues**: none at close (C1 was the verify-time CRITICAL-UNTESTED class; closed by remediation commit `d190f49` and re-verified — see Verdict).
- **Action Context Guard**: no `workspace-planning` mode or `allowedEditRoots` restrictions were in effect; all operations stayed inside the repository.

## Specs Synced

| Domain | Action | Details |
|---|---|---|
| `real-provider-execution` | Created (new domain) | Delta spec at change root `spec.md` (orchestrator contract) synced to main spec `openspec/specs/real-provider-execution/spec.md`; 7 requirements / 11 scenarios, full public surface preserved, nothing invented |

The change's delta spec was authored as a full new-domain spec (it has no existing main spec to merge into), so the sync was a mechanical copy, not a requirement-level merge.

## Archive Contents

- `proposal.md` ✅
- `spec.md` ✅ (delta spec, change root; byte-identical to the synced main spec)
- `design.md` ✅
- `tasks.md` ✅ (16/16 complete)
- `exploration.md` ✅
- `apply-progress.md` ✅
- `verify-report.md` ✅ (final revision `76c75bda...`; report HEAD at write time `020fd5a`, remediation `d190f49` recorded above)
- `archive-report.md` ✅ (this file, additive)

## Mechanical Copy Contract (readback evidence)

- Change-folder final-state files sourced from tree `d190f49` via `git checkout` and shell `Copy-Item`; byte-identity verified by blob hash and SHA-256 before the move:
  - `tasks.md` blob `fcdfb0b5...` == `d190f49:...tasks.md` ✅
  - `apply-progress.md` blob `9f15c609...` == `d190f49:...apply-progress.md` ✅
  - `verify-report.md` SHA-256 equal source↔destination ✅
- Spec sync: `diff -r` source vs staged copy — **empty output, exit 0**; blob hash `3e20225f...` equal source↔`openspec/specs/real-provider-execution/spec.md` ✅
- Archive move: recursive snapshot taken before `git mv`; `diff -r` snapshot vs `openspec/changes/archive/2026-09-18-eos-real-provider-execution` — **empty output, exit 0**; source path confirmed gone ✅ (archive-report.md is additive and excluded from the comparison)

## Source of Truth Updated

`openspec/specs/real-provider-execution/spec.md` now reflects the shipped behavior (main spec, new domain). Active-changes directory no longer lists this change (the archived copy is the audit trail).

## SDD Cycle Complete

Planned (proposal/spec/design/tasks), implemented (3 slices + remediation, 16/16 tasks), verified (PASS WITH WARNINGS, C1/W2 closed), delivered (3 chained PRs open, HITL merge) and archived. Ready for the next change.
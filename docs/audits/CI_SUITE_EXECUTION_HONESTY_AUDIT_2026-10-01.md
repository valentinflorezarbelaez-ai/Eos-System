# CI Suite Execution Honesty Audit — 2026-10-01

- **Scope:** harness gates (`npm test`, `verify:strict`, `.github/workflows/**`, package.json test scripts)
- **Baseline:** `main@8903b578` (merge of PR #566, Mission FI)
- **Decision record:** ADR-0160 · **OpenSpec:** `eos-ci-suite-execution-honesty`
- **Epistemic state:** `AUDIT_EXECUTED` → `FINDINGS_IDENTIFIED` → `REMEDIATION_IN_PROGRESS` → `VERIFIED` (within executed scope)
- **Non-claims:** `PRODUCTION_READY=NO` · green local gates ≠ GitHub Actions green (`BILLING_BLOCKED`) ≠ ladder closure · `Fundacion Δ=0`

## Findings

| # | Finding | Measurement command |
| :-- | :--- | :--- |
| 1 | `ci.yml` *Strict workspace verification* step folded 29 `npm run test:*` lines into argv of `verify-eos.js`; none of those suites executed | `findFoldedRunSteps` over `.github/workflows/ci.yml` |
| 2 | 123 of 320 suites were excluded from `npm test` and invoked by no workflow script (all Ladder 22–41 composition port suites, all L12–L21 seam-packs, post-L26 rituals, provider suites) | `auditCiSuiteReachabilityLock('<main worktree>')` |
| 3 | `npm run test:mission-bi` failed 15/16 — BI7 `Law VI MODULE_DIR CLEAN` found the contiguous `ghp` + `_` prefix in `src/core/continuity/fundacion-delta0-continuity-policy-gate.js` | `node --test tests/eos-bi-cross-session-continuity-replay-fabric.test.js` |
| 4 | `test:du` referenced a non-existent `tests/eos-du-domain-event-publisher.test.js`; `test:security` referenced `tests/mcp/red-teaming.test.js` in an empty directory, while `ai-specs/agents/adversarial-auditor.md` instructs the auditor agent to run it | `findBrokenScriptReferences` |
| 5 | The whole corpus executes in ~12s, so exclusion from the slim suite was never a cost argument for leaving suites ungated | `node --test $(find tests -name '*.test.js')` → `real 0m12.863s` |

Finding 1 explains finding 3: the folded step is why a failing `test:mission-bi` never surfaced.
The CI-wiring assertion that Ladder ≤21 seam-packs enforced (`BQ1`: *"ci.yml seam-pack contains
Ladder 21 BM/BN/BO/BP satellites (fail-closed)"*) was not carried forward from Ladder 22 onward,
which is how finding 2 accumulated across 20 ladders.

## Remediation (this change)

1. Compose the provider prefix at runtime in `fundacion-delta0-continuity-policy-gate.js`.
2. Unfold the `ci.yml` verify step into a dedicated block-scalar step.
3. Add `--full` to `scripts/test-runner.js`, `test:full` to package.json, and a `full-suite`
   job to `ci.yml` declared in `docs/governance/CI_CD_CONTRACT.json`.
4. Repoint `test:du` and `test:security` at existing suites.
5. Add `scripts/lib/ci-suite-reachability-lock.js`, wired into `verify-eos --strict` and
   `tests/github-actions-cicd.test.js` (GHA-009…GHA-012), fail-closed on all three invariants.

## Evidence

| Gate | Before (`main@8903b578`) | After |
| :--- | :--- | :--- |
| `npm run verify:strict` | `Checks Passed: 913` / `Failures: 0` | `Checks Passed: 923` / `Failures: 0` |
| `npm test` (slim, 145 suites) | `# tests 1452`, `# fail 0` | `# tests 1456`, `# fail 0` |
| Full corpus (320 suites) | `# tests 4197`, `# fail 1` (BI7) | `# tests 4201`, `# fail 0` (`npm run test:full`, ~12s) |
| `npm run test:mission-bi` | `# pass 15`, `# fail 1` | `# pass 16`, `# fail 0` |
| `npm run test:du` | fails (missing file) | `# tests 17`, `# fail 0` |
| `npm run test:security` | fails (missing file) | `# tests 49`, `# fail 0` |
| Unreachable suites | 123 | 0 |
| Dangling test script references | 2 | 0 |
| Folded `run:` scalars | 1 | 0 |
| `node scripts/ci/assert-gha-contract.js` | VERIFIED | VERIFIED |

Slim discovery stays at 145 suites, so the TR-01 ceiling (`tests/test-runner.test.js`,
`files.length <= 145`) is unchanged.

## Residual risk

- GitHub Actions is still `BILLING_BLOCKED`; the `full-suite` job is declared and contract-asserted
  but cannot be observed green until billing is restored. Local `verify:strict` + `test:full` remain
  the executed gates.
- The full corpus writes to `EOS-MISSION-CONTROL/ACTIVE_TOOLS.json`, `docs/evidence/EVD-0060.json`
  and `docs/reports/executive/EXECUTIVE_DOSSIER_PRJ-APP-FUERZA.md`. The `full-suite` job discards
  those paths after running; making those suites hermetic is a separate change.
- Reachability means a declared gate executes the suite. It does not claim the suite is sufficient,
  nor that mutation/adversarial coverage is complete.

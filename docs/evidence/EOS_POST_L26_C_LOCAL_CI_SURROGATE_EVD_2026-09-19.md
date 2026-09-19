# EVD — Post-L26 C Local CI Surrogate Hardening (2026-09-19)

## Meta

| Field | Value |
|---|---|
| Workstream | C (ADR-0059 / ADR-0064) |
| Package | `/workspace/eos-post-l26-c-ci-surrogate/` |
| Host machineId | `77c24295-69bc-4113-82ab-1d8f0359a5e7` |
| Host path | `C:\Users\valen\Documents\Eos system` |
| Host live scan | BLOCKED (prefer fixtures + host-apply patch) |
| Freeze tip (OBSERVED backlog) | `47cf1a79` / `47cf1a790c95f78a79e34830c4d6515d16dc67d0` |
| HEAD after B #369 (context) | ~ `279c8be4` |
| PRODUCTION_READY | NO |
| Fundacion Δ | 0 |
| GitHub Actions | BILLING_BLOCKED (environment limitation) |

## Commands (hermetic)

```bash
cd /workspace/eos-post-l26-c-ci-surrogate
node --check src/core/ci/local-ci-surrogate.js
node --check scripts/patch-post-l26-c.mjs
node --check scripts/ci-surrogate-cli.mjs
node --test tests/eos-post-l26-c-local-ci-surrogate.test.js
node scripts/ci-surrogate-cli.mjs --json   # fixture demo; exit 0; still BILLING_BLOCKED
```

## Prerequisites (documented for host verify:strict)

1. Node.js >= 18 (L0 builtins; surrogate itself needs no npm install)
2. Eos system checkout at host path
3. Freeze tip evidence (`docs/releases/EOS_FREEZE_GATE_STATUS.md` `main_tip` or injected)
4. `git rev-parse HEAD` (or injected `sourceRevision`)
5. Mission-pack SSOT expected identity (fixture or host-generated from live files/scripts)
6. `npm run verify:strict` via injected runner **or** `recordedResult` evidence
7. Clean working tree (dirty → fail-closed)
8. Encode GH Actions as BILLING_BLOCKED — never claim GH green

## Failure matrix (fixtures)

| Case | Expectation |
|---|---|
| pass | clean + match/ahead-measured + SSOT + verify recorded → `ok`; `ci_environment.github_actions=BILLING_BLOCKED` |
| missing evidence | no freeze/HEAD/SSOT → `MISSING_EVIDENCE` (exit 2) |
| missing prereq | no runner/recorded verify → `MISSING_PREREQUISITES` (exit 7) |
| dirty | dirty tree → `DIRTY_TREE` (exit 3) |
| stale freeze | wrong tip / HEAD behind / unmeasured diverge → `STALE_FREEZE` (exit 4) |
| mission-pack drift | file or script map change → `MISSION_PACK_DRIFT` (exit 5) |
| verify fail | recorded/runner fail → `VERIFY_STRICT_FAIL` (exit 6) |

## Billing-blocked encoding

```json
{
  "github_actions": "BILLING_BLOCKED",
  "local_surrogate": "ACTIVE",
  "github_actions_verdict": "NOT_RUN",
  "note": "NON-CLAIM: local surrogate success ≠ GitHub Actions success ≠ production readiness"
}
```

Overrides attempting `GREEN`/`PASS` are refused; fields stay BILLING_BLOCKED / NOT_RUN.

## Surfaces

1. **NEW** `src/core/ci/local-ci-surrogate.js`
2. **TEST** `tests/eos-post-l26-c-local-ci-surrogate.test.js`
3. **PATCH** `scripts/patch-post-l26-c.mjs` — `test:ci-surrogate` / `ci:surrogate`
4. **CLI** `scripts/ci-surrogate-cli.mjs`
5. **FIXTURES** `fixtures/mission-pack-ssot.json`, `fixtures/freeze-gate-snippet.md`
6. **DOCS** ADR-0064, this EVD, release note

## NON-CLAIM

Local success ≠ GitHub Actions success ≠ production readiness.
Billing-blocked is an environment limitation, NOT a passing CI result.

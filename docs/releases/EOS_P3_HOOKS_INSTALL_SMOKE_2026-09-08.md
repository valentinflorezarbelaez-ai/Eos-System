# EOS P3 Hooks Install CI/Verify Smoke - 2026-09-08

**Branch:** `cursor/eos-p3-hooks-install-smoke`
**Base main tip:** `03423d66e7d22c91a494e7e42e81cc5860965020` (post-P2 tip)
**Scope:** P3 ONLY (Ladder 4 J3) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)
**Merge:** NO (push + compare only)

## Goal

## Goal (P3 / J3 DoD)

Installer smoke in CI or verify fails closed if install-git-hooks cannot write the expected pre-push shim.
Prefer a CI seam-pack step that runs the installer into a temp .git/hooks tree (never mutate the CI checkout .git destructively).
NON-CLAIM: local surrogate != GitHub branch-protection enforcement.

## Design

1. scripts/lib/hooks-install-smoke.js
   - runHooksInstallSmoke() - mkdtemp + temp/.git/hooks + installHooks({ hooksDir })
   - Asserts pre-commit and pre-push shim files exist with expected node scripts markers
   - Asserts pre-push shim retains LOCAL ONLY non-claim caveat
   - Negative: missing hooksDir -> installer NO_GIT_DIR fail-closed
   - Negative injectable: success without writing pre-push -> smoke FAIL
   - Cleanup always; does not touch checkout .git
2. auditHooksInstallSurface(rootDir) - path lock + hooks:install/test:p3 package scripts + smoke (wired into verify-eos.js --strict)
3. CI: seam-pack named pack adds npm run test:p3
4. Contract: CI_CD_CONTRACT.md P3 note + assert-gha-contract.js requires test:p3

## Deliverables

1. scripts/lib/hooks-install-smoke.js
2. tests/eos-p3-hooks-install-smoke.test.js + test:p3
3. .github/workflows/ci.yml seam-pack step includes test:p3
4. docs/governance/CI_CD_CONTRACT.md + scripts/ci/assert-gha-contract.js
5. scripts/verify-eos.js REQUIRED_PATHS + 3g6 hooks-install audit
6. This release note + freeze-gate P3 section
7. Dirty unstaged DEFERRED (unchanged)

## Verify

```text
node --test tests/eos-p3-hooks-install-smoke.test.js
npm run test:p3
node scripts/ci/assert-gha-contract.js
node scripts/lib/hooks-install-smoke.js
node scripts/verify-eos.js --strict
```

## Non-claims

- Local hook install / pre-push surrogate is not GitHub branch-protection enforcement (Free private remains RULE_CREATED_NOT_ENFORCED).
- No App Fuerza. No Fundacion mutation.
- No P4+ in this branch.
- No soak; no new GH billing / Team / visibility claims.
- push + compare only; do not merge without PO.
- PRODUCTION_READY remains NO.

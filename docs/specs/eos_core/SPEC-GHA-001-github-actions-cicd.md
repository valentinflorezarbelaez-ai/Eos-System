# Specification: SPEC-GHA-001 GitHub Actions CI/CD for EOS Control Plane

* **Status:** IN IMPLEMENTATION
* **Author:** EOS Autonomous Engineering System
* **Date:** 2026-08-27
* **Target Project:** Control Plane (`PRJ-EOS-MISSION-OS`)

## 1. Executive Summary

EOS has local verification (`scripts/verify-eos.js`, `node --test`) and release-governance engines, but no GitHub Actions pipeline. This specification connects the Control Plane repository to GitHub Actions for continuous integration and a **gated continuous-delivery review**. It does **not** authorize production deployment, Fundación mutation, or npm dependency installation (L0 `NODE_BUILTINS_ONLY`).

## 2. Product & Functional Requirements

- **FR-1:** A CI workflow MUST run on `push` to `main`, on `pull_request`, and on `workflow_dispatch`.
- **FR-2:** CI MUST execute strict workspace verification (`node scripts/verify-eos.js --strict`) without `npm install`.
- **FR-3:** CI MUST execute the Control Plane test suite (`npm test`) without `npm install`.
- **FR-4:** CI MUST syntax-check tracked JavaScript under `bin/`, `src/`, `scripts/`, and `tests/`.
- **FR-5:** CI MUST run local governance engines (`evaluate:release`, `verify:independent`, `audit:system`).
- **FR-6:** CI MUST assert `Fundacion/` is unmodified after every job (Δ = 0).
- **FR-7:** A CD workflow MUST exist as a **release gate only**: `workflow_dispatch` and tags matching `rc/*`.
- **FR-8:** CD MUST NOT deploy to production, GitHub Pages, package registries, containers, or remote hosts.
- **FR-9:** CD MUST persist gate evidence as a GitHub Actions artifact and emit an explicit non-deploy verdict.
- **FR-10:** Workflows MUST use least-privilege `permissions: contents: read` and SHA-pinned official actions.

## 3. Non-Functional & Quality Requirements

- **NFR-1 (Security):** No `pull_request_target`. No secrets besides the implicit `GITHUB_TOKEN`. No write tokens. Actions pinned by commit SHA.
- **NFR-2 (Performance):** Default runner `ubuntu-latest`. CI jobs timeout ≤ 20 minutes each. No npm cache (no lockfile).
- **NFR-3 (Reproducibility):** Node.js 22 on GitHub-hosted runners. Zero npm dependencies. L0 policy preserved.
- **NFR-4 (Governance):** `PRODUCTION_READY` remains `NO` until a separate Level-2 human release authorization exists. CI pass ≠ production release.

## 4. Technical Architecture & Component Boundaries

```text
GitHub event
  → .github/workflows/ci.yml          (verify | test | syntax | governance-gates)
  → .github/workflows/cd-release-gate.yml  (re-run CI commands + persist evidence)
  → docs/governance/CI_CD_CONTRACT.json    (machine-readable policy)
  → scripts/ci/assert-gha-contract.js      (local + CI contract check)
```

Out of scope: EOS-Lab `tsx` tests, production deploy, Dependabot, required-status-check admin API (token cannot mutate branch protection).

## 5. Acceptance Criteria & Test Scenarios

- [ ] **AC-1:** Given a clean clone, when CI files are present, then `tests/github-actions-cicd.test.js` passes.
- [ ] **AC-2:** Given workflow YAML, when scanned, then no production-deploy or `npm install` steps exist.
- [ ] **AC-3:** Given `scripts/verify-eos.js --strict`, when CI artifacts are required paths, then verification PASSes.
- [ ] **AC-4:** Given CD YAML, when inspected, then `EOS_PRODUCTION_DEPLOY` is `false` and no deploy action is referenced.

## 6. Verification & Evidence Plan

```text
node --test tests/github-actions-cicd.test.js
node scripts/ci/assert-gha-contract.js
node scripts/verify-eos.js --strict
```

Evidence record: `docs/evidence/EVD-0039.json`.

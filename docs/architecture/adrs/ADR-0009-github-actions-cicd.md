# ADR-0009: GitHub Actions as the EOS Control Plane CI/CD Provider

* **Status:** Accepted
* **Date:** 2026-08-27
* **Author:** EOS Autonomous Engineering System
* **Target:** EOS Control Plane repository (`valentinflorezarbelaez-ai/Eos-`)

## Context

Local verification exists (`verify-eos.js`, `node:test`, release-governance engines) but pull requests and `main` have no independent remote runner. The Product Owner requested GitHub Actions for all CI/CD. Core remains L0 (`NODE_BUILTINS_ONLY`). Fundación is frozen (Δ = 0). `PRODUCTION_READY` is `NO`.

## Decision

Adopt **GitHub Actions** as the sole CI/CD provider for this repository:

1. **CI** on `main` pushes, pull requests, and manual dispatch.
2. **CD as a release gate**, not a deployer: tags `rc/*` and `workflow_dispatch` re-run verification and upload evidence artifacts.
3. Pin official actions by commit SHA (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`).
4. Do not introduce npm dependencies, self-hosted runners, or production environments.

## Consequences

### Positive

- Every PR gets an independent Linux runner executing the same commands as local governance.
- Deploy risk is structurally absent: no production job exists to fail open.
- L0 clone reproducibility is preserved (`npm install` is a contract violation).

### Negative

- Branch protection / required checks cannot be enabled by this agent (GitHub token lacks administration scope). Humans must attach `EOS CI` jobs as required checks.
- EOS-Lab TypeScript tests (`npx tsx`) stay out of default CI until a lockfile policy upgrade is authorized.

### Reversal

If GitHub Actions is unavailable or a different provider is mandated, replace workflow files and update `docs/governance/CI_CD_CONTRACT.json`. Do not add a second CI provider without an explicit ADR.

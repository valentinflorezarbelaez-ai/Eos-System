# EOS backend standards (Control Plane / L0)

Layer standard for Node Control Plane code. Indexed from `docs/base-standards.md`. Discipline: ADR-0010.

## Runtime

- ESM (`"type": "module"`).
- **L0 `NODE_BUILTINS_ONLY`:** `DEPENDENCY_POLICY_L0.md`. Root `package.json` has no `dependencies` / `devDependencies`.
- Prefer `fs`, `path`, `crypto`, `child_process`, `node:test`. Do not import OpenSpec or other npm packages from `src/core/`.
- OpenSpec CLI, if used, is invoked from `scripts/openspec-cli.js` (PATH shell-out) or a human-installed binary. See `docs/manuals/OPENSPEC_RUNTIME.md`.

## Tests

- `node --test` (`npm test`) for Control Plane.
- TDD when tests exist or behavior is added: RED → GREEN → TRIANGULATE → REFACTOR.
- Evidence is command output (`src/core/sdd/tdd-evidence-receipt.js`). Do not weaken tests to obtain green.
- Organic routing before heavy SDD spawn: `src/core/sdd/organic-routing-gate.js`. Size does not force SDD.

## Architecture

- Preserve before modify. One module, one job.
- Mission phase writes go through `AuthorityTruthSource.commitTransition` (`R-ATS-01`).
- HITL-gated transitions need a valid receipt (`R-HITL-01`).
- `src/core/` is frozen unless the human names the exact change.

## Out of scope here

Frontend theme kits, gentle-ai installers, and coverage quotas. Those are ADR-0010 NON-goals.

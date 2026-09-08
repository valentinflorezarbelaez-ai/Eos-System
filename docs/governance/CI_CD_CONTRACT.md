# EOS CI/CD CONTRACT — GitHub Actions

```text
provider: github-actions
mode: CI + RELEASE_GATE_CD
production_deploy: FORBIDDEN
fundacion_mutation: FORBIDDEN
dependency_policy: L0_NODE_BUILTINS_ONLY
```

Machine-readable companion: `docs/governance/CI_CD_CONTRACT.json`.

## CI (`EOS CI`)

| Job | Command | npm install |
| --- | --- | --- |
| verify | `node scripts/verify-eos.js --strict` | Forbidden |
| test | `npm test` | Forbidden |
| syntax | `node --check` on `bin/`, `src/`, `scripts/`, `tests/` | Forbidden |
| governance-gates | `evaluate:release`, `verify:independent`, `audit:system` | Forbidden |

Triggers: `push` to `main`, `pull_request`, `workflow_dispatch`.

## CD (`EOS CD Release Gate`)

CD evaluates whether a revision is a **release candidate evidence pack**. It does not publish, ship, or mutate production systems.

Triggers: `workflow_dispatch`, tags `rc/*`.

Verdict axiom: **CI pass ≠ PRODUCTION READY ≠ RELEASE APPROVED**.

## ROI3 fail-closed note
Orphan workflow YAMLs outside this contract are rejected by scripts/ci/assert-gha-contract.js. Legacy eos-ci.yml removed. continue-on-error true is forbidden on EOS CI.

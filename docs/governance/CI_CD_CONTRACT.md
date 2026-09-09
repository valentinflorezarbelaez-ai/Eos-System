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
| seam-pack | `gameday:long-run` + `test:roi3`..`test:roi6` + `test:m1`..`test:m4` + `test:n2`..`test:n6` + `test:p2`..`test:p6` | Forbidden |

Triggers: `push` to `main`, `pull_request`, `workflow_dispatch`.

## CD (`EOS CD Release Gate`)

CD evaluates whether a revision is a **release candidate evidence pack**. It does not publish, ship, or mutate production systems.

Triggers: `workflow_dispatch`, tags `rc/*`.

Verdict axiom: **CI pass ≠ PRODUCTION READY ≠ RELEASE APPROVED**.

## ROI3 fail-closed note
Orphan workflow YAMLs outside this contract are rejected by scripts/ci/assert-gha-contract.js. Legacy eos-ci.yml removed. continue-on-error true is forbidden on EOS CI.

## M5 seam-pack note (2026-09-08)
Fifth CI job `seam-pack` (`CI GameDay / ROI seam pack`) is contract-required. If/when branch protection required checks are updated, add this check name via HITL; do not invent GitHub enforcement. Status remains RULE_CREATED_NOT_ENFORCED on Free private. PRODUCTION_READY remains NO.

## P2 seam-pack note (2026-09-08)
seam-pack named pack extended with CI-safe `test:n2`..`test:n6` (Ladder 3 N locks). No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## P3 hooks-install smoke note (2026-09-08)
seam-pack named pack extended with CI-safe `test:p3` (temp-dir hooks installer smoke; does not mutate checkout `.git`). verify:strict also audits installer surface + smoke. Local surrogate != GH enforcement. No soak. No new GH billing claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

## Q2 seam-pack note (2026-09-09)
seam-pack named pack extended with CI-safe `test:p2` + `test:p4`..`test:p6` (Ladder 4 P locks; keep `test:p3`). No soak. No new GH billing / enforcement claims. Fundacion delta-0 unchanged. PRODUCTION_READY remains NO.

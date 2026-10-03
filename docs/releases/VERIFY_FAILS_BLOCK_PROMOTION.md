# A failing verify blocks promotion

Status: description of files already in the repo. This note does not change GitHub settings. Remote branch protection is `NOT VERIFIED` here. `PRODUCTION_READY`: no.

## What fails closed

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main`. The header states fail-closed required checks and no `continue-on-error`.

| Job | Command that must exit 0 | If it does not |
| --- | --- | --- |
| `verify` | `node scripts/verify-eos.js --strict` | The job fails. Promotion is not granted by this workflow. |
| `test` | `npm test` | The job fails. |
| `syntax` | `node --check` on JavaScript under `bin`, `src`, `scripts`, `tests` | The job fails. |
| `governance-gates` | release evaluation, independent verification, system audit | The job fails. |
| `seam-pack` | named ROI and ladder test scripts | The job fails. |

Each of those jobs also checks that `Fundacion/` has no diff and no extra untracked files.

`.github/workflows/cd-release-gate.yml` is `RELEASE_GATE_ONLY`. It runs `node scripts/verify-eos.js --strict` and `npm test`, writes `production_deploy: false`, and prints that the workflow does not deploy. A failing verify step fails the job. The workflow does not merge and does not ship.

## What this does not do

- It does not auto-merge a green pull request.
- It does not let an agent commit a fix onto `main` when verify fails.
- It does not repair production without a human.
- Autonomy stays `LEVEL_2` supervised. `create` / `plan` / `package` / `submit` / `close` still ask for a human. `eos next --apply` stays limited to low-risk local commands.
- A green CI run is not `PRODUCTION_READY`. The release gate records that axiom itself: `CI_PASS_DOES_NOT_EQUAL_PRODUCTION_READY`.

## Human promotion

Merging to `main` is a human action. This repository’s agent rules forbid `gh pr merge` and direct pushes to `main` unless a human explicitly instructs a merge. This document does not instruct a merge.

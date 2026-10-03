# Spec — Failing verify blocks promotion

## Requirement

Given `.github/workflows/ci.yml`  
When the `verify` job runs `node scripts/verify-eos.js --strict` and that process exits non-zero  
Then the GitHub Actions job fails  
And the workflow does not set `continue-on-error` on that step  
And this repository change does not add a job that commits, merges, or pushes a fix.

Given `.github/workflows/cd-release-gate.yml`  
When it runs  
Then it records `production_deploy: false` and does not deploy  
And a failing strict verify step fails the release-gate job.

Given an operator or agent  
When promotion to `main` is described  
Then the description says merge is human, autonomy stays `LEVEL_2` supervised, and auto-merge is forbidden  
And GitHub branch-protection settings on the remote are `NOT VERIFIED` by this document (they are not stored as an enforced file in this slice).

## Document

The narrative lives in `docs/releases/VERIFY_FAILS_BLOCK_PROMOTION.md` and is summarized on `site/index.html`.

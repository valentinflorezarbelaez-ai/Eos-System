# ROI3 Branch Protection HITL

Date: 2026-09-08 America/Bogota
Repo: valentinflorezarbelaez-ai/Eos-
Target branch: main
Status: NOT configured via API this session (gh unauthenticated). Do not invent that protection is already on.
PRODUCTION_READY: NO

## Exact UI settings for Valentin

1. GitHub repo Settings, Branches, Add rule (or Edit) for pattern main.
2. Require a pull request before merging (approvals >= 1 recommended).
3. Require status checks to pass before merging; prefer require up-to-date.
4. Required status checks from ci.yml display names:
   - Workspace verify (strict) job id verify
   - Node test suite job id test
   - Optional JavaScript syntax and Local governance engines
5. Block force pushes ON. Block deletions ON. Disallow direct push to main.
6. Save the rule.

Legacy orphan eos-ci.yml was removed in ROI3. Do not re-add as a required check.

Non-claims: protection is not asserted as already enabled; CI pass is not PRODUCTION_READY; Fundacion untouched.

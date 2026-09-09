# ROI3 Branch Protection HITL

Date: 2026-09-08 America/Bogota  
Repo: `valentinflorezarbelaez-ai/Eos-`  
Target branch pattern: `main`  
**Status: RULE_CREATED_NOT_ENFORCED** (GitHub Free private repository)  
Verified: 2026-09-08 via GitHub UI (do not invent beyond this record)  
PRODUCTION_READY: **NO**  
Fundacion: untouched (Δ=0)

## Status summary

A branch protection **rule for pattern `main` exists** and is configured with the settings below. Enforcement is **not active** on this private repository under the Free plan. GitHub UI warning (verbatim sense):

> Your protected branch rules for your branch won't be enforced on this private repository until you move to a GitHub Team or Enterprise organization account.

Until that changes, the rule is recorded / visible but **will not block** direct pushes, force pushes, or merge-without-checks on `main`.

## Exact settings (verified 2026-09-08 GitHub UI)

| Setting | Value |
| --- | --- |
| Rule pattern | `main` — **EXISTS** |
| Require a pull request before merging | **ON** |
| Require status checks to pass before merging | **ON** |
| Require branches to be up to date before merging | **ON** |
| Required status checks (display names) | Workspace verify (strict); Node test suite; JavaScript syntax; Local governance engines; **CI GameDay / ROI seam pack** |
| Allow force pushes | **OFF** |
| Allow deletions | **OFF** |
| Enforcement | **Not enforced** (Free private caveat) |

Legacy orphan `eos-ci.yml` was removed in ROI3. Do not re-add it as a required check.

### 5th check note (N1 / M5)

CI job `seam-pack` publishes display name **`CI GameDay / ROI seam pack`**. This doc **lists** that display name among required-check names for operator honesty after M5. Listing it here does **not** assert that GitHub Settings currently enforce it, nor that Free-plan private enforcement is active. Status remains **RULE_CREATED_NOT_ENFORCED**.

## Enforcement caveat

- **RULE_CREATED_NOT_ENFORCED** means the configuration is present in Settings → Branches, but GitHub will not apply it on a **private** repo on the Free plan.
- Do **not** claim that `main` is operationally protected, that force-push is blocked in practice, or that PRs/status checks are mandatory until enforcement is active.
- CI green / rule present ≠ PRODUCTION_READY.

## Upgrade options (PO decision only)

To make the rule enforceable:

1. **GitHub Team or Enterprise** organization account (keeps repo private; recommended path if privacy must stay).
2. **Public repository** — Free plan enforces branch protection on public repos. **Do not change visibility without explicit PO approval** (privacy / IP / Fundacion implications).

This doc does **not** recommend changing visibility; it only records the option.

## Non-claims

- Protection is **not** asserted as enforced.
- CI pass / rule create is **not** PRODUCTION_READY.
- Fundacion untouched.
- No merge to `main` from this docs branch is implied by recording status alone.
- Naming the 5th check is **not** a claim that GH Settings were updated or that enforcement is active.

## Local main-push surrogate (M2, 2026-09-08)

- Report: `docs/releases/EOS_M2_LOCAL_MAIN_PUSH_SURROGATE_2026-09-08.md`
- Local optional pre-push fail-closed blocks direct/force updates to main unless EOS_ALLOW_MAIN_PUSH=1.
- **Local surrogate ≠ GitHub enforcement.** Status remains **RULE_CREATED_NOT_ENFORCED** on Free private. Do not claim GH protection is active.

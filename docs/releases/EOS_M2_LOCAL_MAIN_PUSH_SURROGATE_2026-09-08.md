# EOS M2 Local Main-Push Surrogate - 2026-09-08

**Branch:** `cursor/eos-m2-local-main-push-surrogate`
**Base main tip:** `ad396f7` (M1 #39 merged)
**Scope:** M2 ONLY (Ladder 2 G2) - EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (unchanged)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (untouched)

## Goal (G2 / M2 DoD)

GitHub branch protection for main is RULE_CREATED_NOT_ENFORCED on Free private.
See docs/releases/ROI3_BRANCH_PROTECTION_HITL.md.
This change adds a local fail-closed surrogate only.
- Block direct updates to refs/heads/main
- Block non-fast-forward updates or delete of refs/heads/main
- Override only with EOS_ALLOW_MAIN_PUSH=1 (dangerous; documented)

Local surrogate is NOT GitHub enforcement. Do not claim branch protection is active.

## Design

1. scripts/pre-push-hook.js — evaluateMainPushGuard({ lines, env, isAncestor })
   parses pre-push stdin and classifies main updates (fail-closed unless allow env).
2. scripts/install-git-hooks.js wires pre-commit and pre-push in one installer.
3. tests/pre-push-main-guard.test.js — deny/allow paths without network.

### Override danger

EOS_ALLOW_MAIN_PUSH=1 bypasses the local surrogate only. Prefer feature branch + PR.

## Deliverables

1. scripts/pre-push-hook.js
2. scripts/install-git-hooks.js (pre-push wired)
3. tests/pre-push-main-guard.test.js
4. This release note + ROI3 HITL / freeze-gate notes
5. Dirty unstaged DEFERRED

## Verify

Run package script test:m2 then verify:strict.

## Non-claims / freeze follow-through

- No GitHub Team upgrade. No visibility change.
- Local hook != GH branch protection enforcement.
- No App Fuerza. No Fundacion mutation.
- No M3+ in this branch.
- Do not merge without PO; push + compare only.
- PRODUCTION_READY remains NO.

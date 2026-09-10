# Design — S6 Model routing + ratchet

## Approach

1. Docs SSOTs under `docs/harness/` (routing + ritual); light ADR-0018 pointer.
2. Combined lock `model-routing-ratchet-lock.js` fail-closed on both docs + companion paths.
3. Wire verify:strict block 3g15; `test:s6` green + fail-closed fixtures.
4. Point to token economics §4 and Antigravity-first; do not invent auto-router runtime.
5. Ratchet maps to existing AGENTS/hooks/CI/locks/logs/subagents — no new schemas.

## Risks

Low — docs + presence lock. Misread risk: operators might treat guidance as auto-switch — mitigated by explicit NON-CLAIM needles in lock.

## AT_CEILING

No new `docs/schemas/**/*.json`.

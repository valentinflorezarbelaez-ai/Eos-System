# ADR-0066: Post-L26 SpecBoot Harness Friction Reduction (Fail-Closed Gate)

- **Status:** Accepted (Workstream E of ADR-0059)
- **Date:** 2026-09-19
- **Owner:** Valentin Florez
- **Related:** ADR-0059 (backlog), ADR-0010 (LIDR SpecBoot discipline), ADR-0062–0065 (A–D), Mission S specboot-agent-runner (≠ this gate)

## Context

Ladder 26 is sealed `CLOSED_FOR_LOCAL_GOVERNED_USE` (Mission CP #365 @ `47cf1a79` + tip-seal #366). Post-L26 perfection backlog Workstream E asks to reduce SpecBoot harness friction while **increasing** fail-closed behavior.

Operator preference (Antigravity-first LIDR): `/enrich_us` → `/propose` → `/apply` → `/verify+/code_review` → `/archive+/commit` → publish (HITL).

Observed friction: manual changeId/path copy-paste, repeated dirty/HEAD checks, ambiguous ownership at archive/commit, and honesty risk that fewer steps could be misread as automatic seal or `PRODUCTION_READY` flip.

COMPLEXITY_BUDGET schemas are **35/35 AT_CEILING** — no new `docs/schemas/**/*.json`. Host Shell machineId often BLOCKED for executors — ship hermetic package + fixtures.

## Decision

1. Add `src/core/specboot/specboot-friction-gate.js` as a **gate-only** helper (injectable FS/git) that fail-closes on missing prerequisites, dirty state, stale inputs, and ambiguous ownership, returning structured refuse reasons + actionable diagnostics.
2. Publish friction inventory + mermaid sequence + safe automation proposals in `docs/releases/EOS_POST_L26_E_SPECBOOT_FRICTION_INVENTORY_2026-09-19.md`.
3. Preserve explicit human gates: refuse `autoSeal`, refuse `PRODUCTION_READY` flip, require `humanCommitAck` / `humanPublishAck` for those steps.
4. Ship minimal hermetic test matrix (happy + refusal) and host patcher `scripts/patch-post-l26-e.mjs` (test scripts + SLIM exclude).
5. **Do not** implement a full SpecBoot CLI rewrite; **do not** auto-seal L26; **do not** flip `PRODUCTION_READY`.
6. Keep Fundacion Δ=0, Law VI, never reopen L17–L26, no L27. No new counted JSON schemas.

## Non-decisions

- Not a replacement for ADR-0010 skills/commands / `node bin/eos.js` / Mission S agent runner.
- Not authorization to auto-merge, auto-seal, or claim production readiness.
- No CloudAgent path. No Fundacion writes. No git push from hermetic executor.
- No new `docs/schemas/*.json` while AT_CEILING holds.

## Consequences

- **Positive:** Operators get repeatable preflight refuses with actionable diagnostics; honesty surfaces for seal/readiness stay explicit; friction is inventoried for future automation.
- **Negative:** Operators still walk slash/skills manually; gate does not orchestrate the full LIDR cycle.
- **Invariants preserved:** `PRODUCTION_READY=NO`, Fundacion Δ=0, Law VI, L17–L26 never reopen, L27 not started, schemas AT_CEILING unchanged.

## Acceptance

- Hermetic `node --test tests/eos-post-l26-e-specboot-friction.test.js` green.
- `node --check` on changed JS.
- RESULT.json status `POST_L26_E_SPECBOOT_FRICTION_READY`.
- Inventory + ADR + EVD + APPLY present; no `docs/schemas/**/*.json` added.

## NON-CLAIMS

- Fewer manual steps ≠ automatic closure ≠ production flip.
- Gate PASS ≠ L26 seal ≠ GitHub Actions green.
- Friction inventory ≠ proof a check is safe to remove.

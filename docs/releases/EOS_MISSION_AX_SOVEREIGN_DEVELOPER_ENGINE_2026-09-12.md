# Mission AX — Sovereign Developer Engine Core / Autonomous Code Loop (SPEC-0055) — 2026-09-12

## Summary

Hermetic **Sovereign Developer Engine Core** — governed autonomous code
loop `runGovernedCodeLoop({ artifactPath, intent, ports, policies })`
with phases **PLAN → EDIT → VERIFY → SEAL**, injectable AF-like /
AG-like ports (fakes only — **compose/extend, do not rewrite** AF/AG),
fail-closed DENY on budget / HITL / Law VI / Fundacion / allowlist miss,
and sealed EVD-style receipts (sha256 via `node:crypto`). Additive under
`src/core/developer-engine/` — **does not** implement AY/AZ/BA/BB,
**does not** flip PRODUCTION_READY, **does not** use CloudAgent,
**does not** claim unsupervised internet-facing agency or PRODUCTION_READY
coding SaaS.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `e0b2bb8` (full `e0b2bb823473dc14f5d41aa322133a3aea2a5635`) |
| Branch | `grok/mission-ax-sovereign-developer-engine-core` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-ax` |
| Payload | `C:\Users\valen\Documents\Eos-mission-ax-payload` |
| Ladder 17 | **CLOSED** — never reopen |
| Ladder 18 | **OPEN** — axis Sovereign Developer Engine |
| Commit | `feat(engine): Sovereign Developer Engine Core / Autonomous Code Loop (SPEC-0055)` |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) — `AX_PRODUCTION_READY='NO'` |
| unsupervised internet-facing agent | **NON-CLAIM** |
| PRODUCTION_READY coding SaaS | **NON-CLAIM** |
| CloudAgent orchestration | **NON-CLAIM** — Antigravity-first |
| AY / AZ / BA / BB | **NOT implemented** in this mission |
| AF/AG rewrite | **NOT done** — injectable ports / fakes only |

## Routing

| Signal | Path |
| --- | --- |
| Kind | `eos-sovereign-developer-engine-core` |
| Codes | `OK`, `COMPLETED`, `DENY`, `BUDGET_DENY`, `HITL_REQUIRED`, `LAW_VI_DENY`, `FUNDACION_DENY`, `ARTIFACT_NOT_ALLOWLISTED`, `VERIFY_FAILED`, `MISSING_DEP`, `INVALID_REQUEST`, `PHASE_DENIED` |
| Tests | `tests/eos-ax-sovereign-developer-engine.test.js` (AX1–AX20) |
| Scripts | `test:developer-engine-core` / `test:mission-ax` / `test:sovereign-developer-engine` |
| Slim | exclude `eos-ax-sovereign-developer-engine.test.js` (≤145) |
| Patcher | `scripts/patch-mission-ax.mjs` (CRLF-safe) |

## EARS (L18 audit §AX)

1. WHEN an operator requests a governed autonomous code loop over allowlisted artifacts, THE SYSTEM SHALL run the Sovereign Developer Engine Core that plans, edits, verifies, and seals a receipt fail-closed.
2. IF budget, HITL, Law VI, or Fundacion policy is violated during the loop, THE SYSTEM SHALL DENY further progress and emit a sealed receipt.
3. WHILE the autonomous code loop is in progress, THE SYSTEM SHALL not claim unsupervised internet-facing agency or PRODUCTION_READY coding SaaS completeness.

## Artifacts

- `src/core/developer-engine/sovereign-developer-engine.js`
- `src/core/developer-engine/code-loop-phases.js`
- `src/core/developer-engine/engine-receipt.js`
- `src/core/developer-engine/policy-gate.js`
- `tests/eos-ax-sovereign-developer-engine.test.js`
- `scripts/patch-mission-ax.mjs`
- `openspec/changes/eos-mission-ax-sovereign-developer-engine-core/`
- `PACKAGE_SCRIPTS_NOTE.md`
- `MISSION_AX_BOOTSTRAP.ps1`

## Verify (box)

```bash
node --test tests/eos-ax-sovereign-developer-engine.test.js
node --check src/core/developer-engine/*.js
```

Host bootstrap NOT run in box (Antigravity-first payload-only).

## MEASURED (box-green)

See `BOX_GREEN.md` in payload root.

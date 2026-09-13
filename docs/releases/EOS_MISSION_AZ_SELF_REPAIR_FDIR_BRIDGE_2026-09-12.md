# Mission AZ — Deterministic Self-Repair & FDIR Remediation Bridge (SPEC-0057) — 2026-09-12

## Summary

Hermetic **Deterministic Self-Repair & FDIR Remediation Bridge** —
`proposeRepair({ fault, allowlist, ports })` with phases
**CLASSIFY → GATE → PLAN → BRIDGE → SEAL**, deterministic bounded repair
plans (stable `planHash`; no randomness), optional V FDIR / AX fault
injectable ports (**compose/extend, do not rewrite** V/AX/AY), fail-closed
DENY on unbounded self-mod / Fundacion / Law VI leakage / unknown, and
sealed EVD-style receipts (sha256 via `node:crypto`). Additive under
`src/core/developer-engine/` — **does not** implement BA/BB, **does not**
flip PRODUCTION_READY, **does not** use CloudAgent, **does not** claim
unbounded self-modifying AGI / unsupervised internet remediator /
CloudAgent self-heal fleet.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `e1bc380` (full `e1bc3801dc4e18342278861096df5c59255c0152`) |
| Branch | `grok/mission-az-deterministic-self-repair-fdir-bridge` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-az` |
| Payload | `C:\Users\valen\Documents\Eos-mission-az-payload` |
| Ladder 17 | **CLOSED** — never reopen |
| Ladder 18 | **OPEN** — AX+AY MEASURED; AZ this mission; BA–BB pending |
| Commit | `feat(engine): Deterministic Self-Repair & FDIR Remediation Bridge (SPEC-0057)` |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) — `AZ_PRODUCTION_READY='NO'` |
| unbounded self-modifying AGI | **NON-CLAIM** |
| unsupervised internet remediator | **NON-CLAIM** |
| CloudAgent self-heal fleet | **NON-CLAIM** — Antigravity-first |
| BA / BB | **NOT implemented** in this mission |
| V/AX/AY rewrite | **NOT done** — optional injectable ports / fakes only |

## Routing

| Signal | Path |
| --- | --- |
| Kind | `eos-deterministic-self-repair-fdir-bridge` |
| Codes | `OK`, `COMPLETED`, `DENY`, `UNBOUNDED_SELF_MOD_FORBIDDEN`, `FUNDACION_DENY`, `LAW_VI_DENY`, `NOT_REMEDIABLE`, `INVALID_FAULT`, `MISSING_DEP`, `INVALID_REQUEST`, `HITL_REQUIRED` |
| Tests | `tests/eos-az-self-repair-fdir-bridge.test.js` (AZ1–AZ18) |
| Scripts | `test:self-repair-bridge` / `test:mission-az` |
| Slim | exclude `eos-az-self-repair-fdir-bridge.test.js` (≤145) |
| Patcher | `scripts/patch-mission-az.mjs` (CRLF-safe) |

## EARS (L18 audit §AZ)

1. WHEN governed developer-loop fault classified remediable → deterministic self-repair plan via FDIR bridge + sealed receipt.
2. IF plan requires unbounded self-mod / Fundacion writes / Law VI leakage → DENY + sealed receipt.
3. WHILE self-repair in progress → fail-closed; no AGI claim.

## Law VI (CRITICAL)

In Law VI audit test, scan **ONLY** `MODULE_DIR` = `src/core/developer-engine`
(the AZ modules). **Do NOT** scan the whole `tests/` directory (forensic
fixtures may contain patterns). Documented in BOX_GREEN and this release.

## Artifacts

- `src/core/developer-engine/self-repair-fdir-bridge.js`
- `src/core/developer-engine/fault-classifier.js`
- `src/core/developer-engine/repair-plan.js`
- `src/core/developer-engine/repair-receipt.js`
- `src/core/developer-engine/repair-policy-gate.js`
- `tests/eos-az-self-repair-fdir-bridge.test.js`
- `scripts/patch-mission-az.mjs`
- `openspec/changes/eos-mission-az-deterministic-self-repair-fdir-bridge/`
- `PACKAGE_SCRIPTS_NOTE.md`
- `MISSION_AZ_BOOTSTRAP.ps1`

## Verify (box)

```bash
node --test tests/eos-az-self-repair-fdir-bridge.test.js
node --check src/core/developer-engine/*.js
```

Host bootstrap NOT run in box (Antigravity-first payload-only).

## MEASURED (box-green)

See `BOX_GREEN.md` in payload root.

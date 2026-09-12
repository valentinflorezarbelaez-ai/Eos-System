# Mission AT — Operator Continuity / Crash-Recovery Custody Port (SPEC-0051) — 2026-09-12

## Summary

Hermetic **Operator Continuity / Crash-Recovery Custody Port** — injectable
continuity port over AI+W (+ optional AN envelopes) that restarts governed
sessions after process crash with sealed custody on disk:
`checkpoint` → sealed snapshot; `simulateCrash` → clear live state;
`restart` → `RESTART_OK` restoring allowlisted session state;
DENY on tamper (`TAMPER_DETECTED`), tip mismatch (`TIP_MISMATCH`),
conflicting custody heads (`CUSTODY_CONFLICT`); fail-closed
`PARTIAL_APPLY_FORBIDDEN` while recovery in progress; Fundacion ALWAYS_DENY;
Law VI sanitize. Reuse injectable custody store fakes — don't rewrite full
AI/AN. Hermetic fakes only. Additive under `src/core/continuity/` —
**does not** implement AU/AV/AW, **does not** flip PRODUCTION_READY,
**does not** use CloudAgent, **does not** claim HA multi-region SaaS /
multi-AZ failover product / CloudAgent fleet recovery.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `9139b15` (`9139b159f42df391cf8e9c22d109fdfb74ad5739`) |
| Branch | `grok/mission-at-operator-continuity-crash-recovery` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-at` |
| Payload | `C:\Users\valen\Documents\Eos-mission-at-payload` |
| Ladder 17 | AS MEASURED (#247); **AT this mission**; AU/AV/AW not this mission |
| Commit | `feat(continuity): operator continuity crash-recovery custody port (SPEC-0051)` |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) — `AT_PRODUCTION_READY='NO'` |
| HA multi-region SaaS | **NON-CLAIM** — continuity ≠ HA multi-region SaaS |
| multi-AZ failover | **NON-CLAIM** — ≠ multi-AZ failover product |
| CloudAgent fleet recovery | **NON-CLAIM** — Antigravity-first |
| AU/AV/AW | **NOT implemented** in this mission |
| Secrets in repo | **FORBIDDEN** — Law VI; runtime synth only (AF11 lesson) |

## Routing

| Signal | Path |
| --- | --- |
| Kind | `eos-operator-continuity-crash-recovery-port` |
| Codes | `OK`, `RESTART_OK`, `TAMPER_DETECTED`, `TIP_MISMATCH`, `CUSTODY_CONFLICT`, `MISSING_DEP`, `INVALID_REQUEST`, `SECRET_LEAK_FORBIDDEN`, `FUNDACION_DENIED`, `PARTIAL_APPLY_FORBIDDEN` |
| Tests | `tests/eos-at-operator-continuity-crash-recovery.test.js` (AT1–AT18) |
| Scripts | `test:operator-continuity` / `test:mission-at` |
| Slim | exclude `eos-at-operator-continuity-crash-recovery.test.js` (≤145) |
| Patcher | `scripts/patch-mission-at.mjs` (CRLF-safe) |

## EARS (L17 audit §AT)

1. WHEN governed session process crashes with sealed custody on disk, THE SYSTEM SHALL offer continuity restart restoring allowlisted session state without mutating Fundacion.
2. IF restart detects tamper, tip mismatch, or conflicting custody heads, THE SYSTEM SHALL DENY restart and emit sealed receipt.
3. WHILE continuity recovery in progress, THE SYSTEM SHALL remain fail-closed (no partial apply; no silent HA multi-region claim).

## Artifacts

- `src/core/continuity/operator-continuity-crash-recovery-port.js`
- `src/core/continuity/continuity-receipt.js`
- `src/core/continuity/custody-snapshot.js`
- `tests/eos-at-operator-continuity-crash-recovery.test.js`
- `scripts/patch-mission-at.mjs`
- `openspec/changes/eos-mission-at-operator-continuity-crash-recovery/`
- `PACKAGE_SCRIPTS_NOTE.md`
- `MISSION_AT_BOOTSTRAP.ps1`

## Verify (box)

```bash
node --test tests/eos-at-operator-continuity-crash-recovery.test.js
# rg Law VI: no static vendor-key prefix literals (runtime synth only)
```

Host bootstrap NOT run in box (Antigravity-first payload-only).

# Mission AL — Autonomy Replay & Forensic Observer (SPEC-0043) — 2026-09-12

## Summary

Hermetic **Autonomy Replay & Forensic Observer** — injectable,
fail-closed, observe-only replay over AJ-like EVD ledger + AI-like
session records. Deterministic re-walk of sealed multi-session
timelines reproduces cycle ordering and deny/allow outcomes. Forensic
timeline export + optional AE ECR attribution observe. Law VI
deep-redacts secrets (runtime synth only — no static vendor-key prefix
substring). Additive under `src/core/observability/` — **does not**
implement AM, **does not** flip PRODUCTION_READY, **does not** use
CloudAgent, **does not** mutate live ledger/session state, **does not**
claim SIEM / billing products.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `8cf5538` (`8cf55386f0829d5081b34753e15b142eb179df1f`) |
| Branch | `grok/mission-al-autonomy-replay-forensic-observer` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-al` |
| Payload | `C:\Users\valen\Documents\Eos-mission-al-payload` |
| Ladder 15 | AI+AJ+AK MEASURED; **AL this mission**; AM not this mission |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| Autonomy replay | **NON-CLAIM** — ≠ SIEM product ≠ PRODUCTION_READY cost billing ≠ billing accuracy |
| Observe-only | **YES** — no live state mutation (no append/save on injectors) |
| AM | **NOT implemented** in this mission |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| Secrets in repo | **FORBIDDEN** — Law VI; runtime synth only (AF11 lesson) |
| Live network in CI | **FORBIDDEN** — hermetic fakes only |

## Routing

| Signal | Path |
| --- | --- |
| Factory | `createAutonomyReplayForensicObserver` |
| Replay | `replay(timelineId\|filter)` — deterministic re-walk; no mutation |
| Verify | `verifyReplayInputs(...)` — fail-closed incomplete / chain-broken |
| Export | `exportForensicTimeline(...)` — post-mortem forensic envelope |
| Attribution | `observeAttribution(filter?)` — ECR aggregates; ≠ billing |
| Receipt | `sealReceipt(outcome)` |
| Fail-closed codes | `REPLAY_ABORT`, `CHAIN_BROKEN`, `INCOMPLETE_INPUTS`, `TIMELINE_NOT_FOUND`, `SILENT_GAP_FORBIDDEN`, `MISSING_DEP`, `FUNDACION_DENY`, `INVALID_TIMELINE` |
| Law VI | `sanitizePayload` — runtime-synth detect |
| AGY / CloudAgent | **NON-CLAIM** |

## EARS

- WHEN sealed multi-session timeline exists in EVD ledger → hermetic replay reproducing cycle ordering and deny/allow outcomes
- IF replay inputs incomplete or chain-broken → abort replay + forensic failure (no silent gaps)
- WHILE attribution observe mode enabled → aggregate AE ECR counters without claiming billing accuracy or PRODUCTION_READY

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/observability/autonomy-replay-forensic-observer.js` | **NEW** |
| `src/core/observability/forensic-timeline-export.js` | **NEW** |
| `tests/eos-al-autonomy-replay-forensic-observer.test.js` | **NEW** |
| `scripts/patch-mission-al.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |
| AM modules | **No** |

## Verification (box harness)

```
cd /workspace/Eos-mission-al-payload && npm run test:mission-al
```

→ **16 PASS**, 0 SKIP, 0 FAIL (AL1–AL16)

Slim exclude basename: `eos-al-autonomy-replay-forensic-observer.test.js`  
Scripts: `npm run test:autonomy-replay-forensic-observer` / `npm run test:mission-al`

## Cases

| ID | Case |
|----|------|
| AL1 | kind + PRODUCTION_READY NO + NON-CLAIM |
| AL2 | hermetic multi-session replay ordering + deny/allow |
| AL3 | chain-broken abort |
| AL4 | incomplete inputs abort |
| AL5 | silent gap forbidden |
| AL6 | forensic export shape |
| AL7 | attribution observe without billing claim |
| AL8 | replay does NOT mutate ledger/session |
| AL9 | PRODUCTION_READY NO locked |
| AL10 | Law VI runtime synth + rg-clean |
| AL11 | NON-CLAIM markers |
| AL12 | Fundacion deny |
| AL13 | MISSING_DEP |
| AL14 | TIMELINE_NOT_FOUND / INVALID_TIMELINE |
| AL15 | hermetic + codes |
| AL16 | verify PASS + throwOnAbort + AM not implemented |

## Host bootstrap

`MISSION_AL_BOOTSTRAP.ps1` — Expected StartsWith `8cf5538`; worktree
`Eos-mission-al`; branch `grok/mission-al-autonomy-replay-forensic-observer`;
patcher → test:mission-al → slim≤145 → verify:strict → commit/push.

Commit: `feat(observability): autonomy replay forensic observer (SPEC-0043)`

**Host bootstrap NOT run from this box** (Antigravity-first payload
build only; parent CopyFromBox later).

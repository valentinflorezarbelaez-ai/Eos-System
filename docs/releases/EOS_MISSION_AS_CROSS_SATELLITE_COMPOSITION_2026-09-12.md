# Mission AS — Cross-Satellite Composition Harness (SPEC-0050) — 2026-09-12

## Summary

Hermetic **Cross-Satellite Composition Harness** — injectable observe/integration
over AN federation × AO failover × AP authority × AQ export fail-closed:
`runScenario` → `COMPOSITION_OK` with sealed receipts + shared EVD linkage;
`composePlanes` → DENY on plane inconsistency (`PLANE_INCONSISTENT`);
concurrent/open composition blocks inconsistent advance
(`COMPOSITION_DENIED`); Fundacion ALWAYS_DENY; Law VI sanitize.
Compose, don't rewrite — plane stubs only. Hermetic fakes only. Additive under
`src/core/composition/` — **does not** implement AT/AU/AV/AW, **does not**
flip PRODUCTION_READY, **does not** use CloudAgent, **does not** claim E2E
product suite / PRODUCTION_READY integration platform / CloudAgent orchestration.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `3a7fb75` (`3a7fb756aafe5848bbceeaaeaf050bb4d693bf6f`) |
| Branch | `grok/mission-as-cross-satellite-composition-harness` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-as` |
| Payload | `C:\Users\valen\Documents\Eos-mission-as-payload` |
| Ladder 17 | L16 CLOSED; **AS this mission**; AT/AU/AV/AW not this mission |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) — `AS_PRODUCTION_READY='NO'` |
| E2E product suite | **NON-CLAIM** — composition ≠ E2E product suite |
| PR integration platform | **NON-CLAIM** — ≠ PRODUCTION_READY integration platform |
| CloudAgent orchestration | **NON-CLAIM** — Antigravity-first |
| AT/AU/AV/AW | **NOT implemented** in this mission |
| Secrets in repo | **FORBIDDEN** — Law VI; runtime synth only (AF11 lesson) |

## Routing

| Signal | Path |
| --- | --- |
| Factory | `createCrossSatelliteCompositionHarness` |
| Scenario | `runScenario(scenario)` — AN×AO×AP×AQ + sealed receipt |
| Compose | `composePlanes(req)` — observe; PLANE_INCONSISTENT / HITL_REQUIRED |
| Advance | `advanceComposition` / `beginComposition` / `endComposition` |
| Seal / state | `sealReceipt(...)` / `getState()` / `getReceipts()` |
| Fail-closed codes | `OK`, `COMPOSITION_OK`, `PLANE_INCONSISTENT`, `COMPOSITION_DENIED`, `MISSING_DEP`, `INVALID_REQUEST`, `SECRET_LEAK_FORBIDDEN`, `EVD_LINK_FAIL`, `FUNDACION_DENIED`, `HITL_REQUIRED` |
| Law VI | `sanitizeAsPayload` — redact apiKey/token/authorization/secret/password; runtime vendor-prefix synth |
| Planes | injectable AN/AO/AP/AQ stubs (`createAnPlaneStub` …) |
| Receipt helper | `composition-receipt.js` / `buildCompositionReceipt` |
| AGY / CloudAgent | **NON-CLAIM** |

## EARS

- WHEN an operator scenario requires coordinated AN+AO+AP+AQ → run composition harness observing plane interactions fail-closed
- IF any composed plane reports inconsistent custody/authority/budget/export state → DENY + sealed receipt
- WHILE composition in progress → not claim E2E product-suite completeness or PRODUCTION_READY

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/composition/cross-satellite-composition-harness.js` | **NEW** |
| `src/core/composition/composition-receipt.js` | **NEW** |
| `src/core/composition/plane-stubs.js` | **NEW** |
| `tests/eos-as-cross-satellite-composition.test.js` | **NEW** |
| `scripts/patch-mission-as.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |
| AT/AU/AV/AW modules | **No** |

## Verification (box harness)

```
cd /workspace/Eos-mission-as-payload && node --test tests/*.test.js
# Law VI: no static vendor-key literals (runtime synth only)
```

Host bootstrap (NOT run from box): `MISSION_AS_BOOTSTRAP.ps1` —
Expected StartsWith `3a7fb75`; WARN on tip mismatch but continue; slim≤145;
verify:strict; commit; push.

## Commit message

```
feat(composition): cross-satellite composition harness AN×AO×AP×AQ (SPEC-0050)
```

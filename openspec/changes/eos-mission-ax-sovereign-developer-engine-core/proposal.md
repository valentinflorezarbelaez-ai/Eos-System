# Proposal — Mission AX: Sovereign Developer Engine Core / Autonomous Code Loop (SPEC-0055)

## Why

Ladder 18 audit ranks **Sovereign Developer Engine Core / Autonomous Code
Loop** first after L17 CLOSED (AS–AW MEASURED). AF autonomous loop + AG
live tools exist MEASURED; there is no typed **developer-engine core** that
governs Plan→Edit→Verify→Seal over allowlisted artifacts with sealed
receipts and fail-closed DENY — without claiming unsupervised
internet-facing agency or PRODUCTION_READY coding SaaS.

## What

1. `src/core/developer-engine/sovereign-developer-engine.js` —
   `createSovereignDeveloperEngine` / `runGovernedCodeLoop`; kind
   `eos-sovereign-developer-engine-core`; injectable ports
   `{ afLoop, agTools, budgetGate, hitlGate, lawViGate, writeBarrier }`;
   codes frozen in `AX_CODES`; `AX_PRODUCTION_READY='NO'`.
2. Thin `code-loop-phases.js` + `engine-receipt.js` (sha256) +
   `policy-gate.js` — phase order, sealed receipts, DENY helpers.
3. Suite `tests/eos-ax-sovereign-developer-engine.test.js` (AX1–AX20)
   hermetic; no network; slim-exclude;
   `npm run test:developer-engine-core` / `test:mission-ax`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## NON-CLAIM

- sovereign developer engine ≠ unsupervised internet-facing agent
- ≠ PRODUCTION_READY coding SaaS / ≠ CloudAgent orchestration
- not AY/AZ/BA/BB
- Fundacion Δ=0; AX_PRODUCTION_READY=NO; Antigravity-first
- L17 CLOSED never reopen; compose/extend AF+AG — do not rewrite

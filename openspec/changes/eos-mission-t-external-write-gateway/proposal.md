# Proposal — Mission T-gate: External Project Write-Barrier Gateway L2 (SPEC-0025a)

## Why

EOS write-barrier already fail-closes real Fundacion (`FUNDACION_ALWAYS_DENY` / ADR-0013 / Δ=0). Operators need a **governed Level-2 gateway** that can authorize writes against an **external hermetic fixture project** only after six explicit preconditions — without ever opening real Documents/Fundacion, without flipping PRODUCTION_READY, and without weakening the write-barrier always-deny surface.

## What

1. New module `src/core/governance/external-write-gateway.js` — `createExternalWriteGateway`, kind `eos-external-write-gateway-l2`, six L2 preconditions (REGISTERED → LEVEL_2_AUTHORIZED), hermetic fixture path gate, Fundacion always-deny overlay, governed write (authorize → applyDiff → runVerifier → rollback on fail), `EXTERNAL_WRITE_GATEWAY_PRODUCTION_READY='NO'`.
2. Suite `tests/governance/external-write-gateway.test.js` (T1–T11 PASS + T12 SKIP); slim-exclude basename; `npm run test:external-write-gateway` / `test:mission-t`.
3. OpenSpec change + release report + bootstrap.
4. Prefer **not** mutating `src/core/write-barrier/*` (gateway is additive overlay).

## DoD

Branch `grok/mission-t-external-write-gateway` from main@d88a5b4b45daaa200618f41ab52402f1cfaf8dae; tests green (≥11 PASS, ≤1 SKIP, 0 FAIL); SLIM≤145; verify:strict EXIT 0 on host.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- Real Fundacion writes / Documents/Fundacion mutation
- PRODUCTION_READY flip
- Weakening write-barrier always-deny for real Fundacion
- Cursor CloudAgent
- Raising TR-01 (prefer exclude-from-slim)
- Rewriting write-barrier cores (prefer)
- New npm dependencies

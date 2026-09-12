# Proposal — Mission AJ: Evidence Economy Ledger (SPEC-0041)

## Why

Ladder 15 audit ranks **Evidence Economy Ledger** as the second L15
satellite (after AI MEASURED). EVD receipts exist per mission / local
seal, but there is no append-only hash-chained ledger with aggregation
+ query SSOT at scale for AI / AK / AL consumers. ADR-0015
HashChainedLedger remains the custody SSOT — AJ is a ledger *layer*,
not a second competing custody core.

User axis: cryptographic evidence ledger, cost tracking per evidence,
trans-session accounting integrity.

## What

1. `src/core/evidence/evidence-economy-ledger.js` —
   `createEvidenceEconomyLedger`; kind `eos-evidence-economy-ledger`;
   `append` / `verifyChain`+`verify` / `query` / `aggregateCosts` /
   `sealReceipt`; injectable `{ hash, now, store/map, costMeter? }`;
   fail-closed `CHAIN_BROKEN` / `TAMPER_DETECTED` / `INVALID_ENTRY` /
   `MISSING_DEP` / `FUNDACION_DENY`; Law VI sanitize; genesis empty
   chain PASS; trans-session entries (sessionId + missionId +
   priorTip / custodyDigest); `AJ_PRODUCTION_READY='NO'`.
2. Thin `src/core/evidence/evidence-cost-tracker.js` observe-only
   attribution helpers (tokens / cost units). ≠ billing product.
3. Suite `tests/eos-aj-evidence-economy-ledger.test.js` (AJ1–AJ16)
   hermetic; **no static vendor-key prefix substring** (runtime synth);
   slim-exclude; `npm run test:evidence-economy-ledger` / `test:mission-aj`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-aj-evidence-economy-ledger` from main tip
starting with `ccb25a9` (StartsWith OK); tests green (~12–16 PASS, 0 FAIL);
SLIM≤145; verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0;
no AI commit attribution; no CloudAgent; zero new npm deps; do NOT implement
AK/AL/AM; no live network in CI.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AK Constitution Runtime / AL Replay / AM closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- External audit platform / compliance certification product
- Billing product / second custody core
- Live network / CloudAgent
- Static vendor API key literals in source/tests

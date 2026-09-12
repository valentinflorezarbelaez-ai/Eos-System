# Proposal — Mission AO: Provider Failover & Resilience Router (SPEC-0046)

## Why

Ladder 16 audit ranks **Provider Failover & Resilience Router** as the second
L16 satellite (after AN). AD LLM Provider Port + AE ECR assume a **single
active provider** with session-scoped budget; there is no ordered failover /
resilience router under ECR that degrades/fail-closes without claiming
PRODUCTION_READY LLM ops.

## What

1. `src/core/llm/provider-failover-resilience-router.js` —
   `createProviderFailoverResilienceRouter`; kind
   `eos-provider-failover-resilience-router`;
   `route` / `invoke` / `probeActive` / `setOrder` /
   `getActiveProviderId` / `listProviders` / `sealReceipt`; injectable
   `{ providers, ecr, now, hash, receiptSealer? }`; fail-closed
   `PROVIDER_PROBE_FAIL` / `ECR_DENY` / `FAILOVER_EXHAUSTED` /
   `MISSING_DEP` / `INVALID_REQUEST` / `SECRET_LEAK_FORBIDDEN` /
   `HITL_REQUIRED`; `AO_PRODUCTION_READY='NO'`.
2. Thin `src/core/llm/provider-health-probe.js` — probe helper.
3. Suite `tests/eos-ao-provider-failover-resilience.test.js`
   (AO1–AO16) hermetic; **no static vendor-key prefix substring**
   (runtime synth); slim-exclude;
   `npm run test:provider-failover-resilience` / `test:mission-ao`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-ao-provider-failover-resilience-router` from main tip
starting with `b741e12` (StartsWith OK); tests green (~12–16 PASS, 0 FAIL);
SLIM≤145; verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0;
no AI commit attribution; no CloudAgent; zero new npm deps; do NOT implement
AP/AQ/AR; hermetic fakes only.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AP HITL Authority / AQ EVD Export / AR L16 closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- PRODUCTION_READY LLM ops / SLA product / multi-cloud billing
- CloudAgent
- Static vendor API key literals in source/tests
- Silent unbounded retry on exhaust

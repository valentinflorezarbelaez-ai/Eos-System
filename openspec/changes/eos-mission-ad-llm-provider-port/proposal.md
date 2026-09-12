# Proposal — Mission AD: LLM Provider Port & Model Routing Adapter (SPEC-0035)

## Why

Ladder 14 audit (SPEC-0035) ranks **Provider Port + Model Routing** as the first
L14 satellite: `eos-shell` / session loop lack an injectable port toward Gemini /
Anthropic / OpenAI / Ollama, and there is no enforceable SSOT for routing/fallback
(`MODEL_ROUTING.md`). Mission X is provider-agnostic REPL only.

## What

1. `src/core/llm/llm-provider-port.js` — `createLlmProviderPort` kind
   `eos-llm-provider-port`; methods `complete` / `health` / `getState` /
   `listProviders` / `resolveRoute`; injectable adapters; fake always available;
   stubs fail-closed without env; Law VI redaction; `LLM_PRODUCTION_READY='NO'`.
2. `src/core/llm/model-router.js` — load/parse `docs/model-routing/MODEL_ROUTING.md`;
   ordered resolve + fallback; `ROUTING_SSOT_INVALID` fail-closed.
3. `src/core/llm/fake-llm-provider.js` — hermetic deterministic adapter.
4. Suite `tests/eos-ad-llm-provider-port.test.js` (AD1–AD15); slim-exclude;
   `npm run test:llm-provider-port` / `test:mission-ad`.
5. OpenSpec change + release report + bootstrap + idempotent patcher.

## DoD

Branch `grok/mission-ad-llm-provider-port` from main tip starting with `6be6aaf`
(StartsWith; tip-194 + L14 audit); tests green (~12–16 PASS, 0 FAIL); SLIM≤145;
verify:strict EXIT 0 on host; PRODUCTION_READY=NO; Fundacion Δ=0; no AI commit
attribution; no CloudAgent; zero new npm deps; secrets env-only.

## Routing

**SDD** / Antigravity-first / Zero vibe coding / No Cursor CloudAgent.

## NON-goals

- AE token-budget / AF live loop / AG tool engine / AH L14 closeout
- PRODUCTION_READY flip
- Real Fundacion writes
- API keys in repo
- External LLM SDKs required for CI
- Claiming live LLM ≡ PRODUCTION_READY
- CloudAgent

# Tasks: Real Provider Execution

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~950 total: Slice 1 ~395, Slice 2 ~300, Slice 3 ~180 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 (design slice plan) |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | OpenRouterAdapter + registry mapping + env-gate names | PR 1 | `node --test tests/eos-rp-real-provider-execution.test.js` + `npm run test:law-vi-broker` | N/A — hermetic; live call is manual dev-mode only | delete `openrouter-adapter.js`; revert registry/env-gate/index edits |
| 2 | `enrutarMisionReal` + ECR gate + error bridge + probe | PR 2 | `node --test tests/eos-rp-real-provider-execution.test.js` + `npm run test:token-budget-ecr` + `npm run test:autonomous-loop` + `npm run test:provider-failover-resilience` | N/A — zero network (mock fetchImpl doubles) | revert provider-router.js additions; MCP still NOT_CONFIGURED |
| 3 | MCP route/health rewiring + flips + suite registration | PR 3 | `node --test tests/mcp-stdio-smoke.test.js tests/mcp-readonly-guard.test.js tests/mcp-surface-slim.test.js` + `npm run test:real-provider` | N/A — hermetic full `npm test`, zero real network | revert mcp-server.js handlers + flip assertions |

Slice boundaries: PR 1 start=create `openrouter-adapter.js`, finish=`MODEL_ROUTING_MAP`/`resolveModel` + env-gate names, verify=`npm run test:core` green; PR 2 start=`enrutarMisionReal`, finish=probe + fallback modes, verify=`npm run test:core` + `npm test` green; PR 3 start=handler rewiring, finish=flips re-asserted + tool count 80, verify=full `npm test` + `npm run verify:strict`.

## Phase 1: Adapter + Registry + Broker Allowlist (PR 1)

- [x] 1.1 RED: add adapter describe-blocks in `tests/eos-rp-real-provider-execution.test.js` (`getName()==='OPENROUTER'`, LlmPort shape, injectable `fetchImpl` double, `receiveSecret`, key precedence `__runtimeSecret||apiKey||env`, 401/403/429/abort taxonomy, usage mapping, `probe()` shape) → RED output captured
- [x] 1.2 GREEN: create `src/core/adapters/llm/openrouter-adapter.js` per design Interfaces (OpenAI-compatible POST, `Authorization: Bearer`, AbortController timeout, `response_format` for structured schema, cost from capabilities) → GREEN
- [x] 1.3 TRIANGULATE: mock double sees Bearer only with injected key; zero secrets in adapter error dumps; no `PRODUCTION_READY` from adapter → GREEN
- [x] 1.4 RED+GREEN: extend `src/core/secrets/env-gate.js` allowlists — names `GEMINI_API_KEY`, `OPENROUTER_API_KEY`; adapters `adapter-gemini`, `adapter-openrouter` → RED assert via `checkInject`, GREEN via `npm run test:law-vi-broker`
- [x] 1.5 GREEN: wire `src/core/adapters/llm/adapter-registry.js` — register OpenRouterAdapter, `MODEL_ROUTING_MAP` + `resolveModel(matrixId)` (claude-3-5-sonnet→OPENROUTER/anthropic/claude-3.5-sonnet; gpt-4o→OPENROUTER/openai/gpt-4o; gemini-1-5-pro→GOOGLE_GEMINI/gemini-1.5-pro); `getAdapter`/prefix unchanged; re-export in `src/core/index.js` → GREEN
- [x] 1.6 REFACTOR: consolidate doubles; slice boundary `npm run test:core` 20/20 GREEN

## Phase 2: Real Dispatch + Budget Gate + Health Probe (PR 2)

- [x] 2.1 RED: dispatch/credential/budget/health tests — successful dispatch receipt (`proveedorUtilizado`, `modo`, `latency_ms`, `usage`, `PRODUCTION_READY:'NO'`); unmapped→`ADAPTER_NOT_FOUND` zero-I/O; no keys→`NO_CREDENTIALS`; exhausted ECR→`BUDGET_EXCEEDED` before any network (double never called); fallback ≤2 sanctioned calls; keys never in receipt/errors → RED captured
- [x] 2.2 GREEN: additive `enrutarMisionReal(taskType, request, opts)` in `src/core/provider-router.js` — resolveModel → broker `resolveSecret`/`injectToAdapter` → ECR `beforeCall` → `infer()` → `afterCall`/`recordUsage` → receipt; `enrutarMision` + `forzarFallo*` byte-identical → GREEN
- [x] 2.3 GREEN: LlmPort→router bridge per D4 (`LLM_TIMEOUT`→`PROVIDER_TIMEOUT`; auth/rate/provider/schema→`PROVIDER_UNAVAILABLE` + `providerCode`; `LLM_BUDGET_EXCEEDED`→`BUDGET_EXCEEDED`); AU-redacted messages, full prompt never in errors → GREEN
- [x] 2.4 GREEN: `probeProviderHealth(providerId)` per D5 — unknown→`PROVIDER_UNAVAILABLE` no throw; broker presence; OpenRouter `probe()` (max_tokens:1, timeout/retry ×2→`PROVIDER_TIMEOUT`); Gemini presence-only; returns `status, latency_ms, credentials, PRODUCTION_READY:'NO'`, no secrets → GREEN
- [x] 2.5 TRIANGULATE: double spy — zero network on all fail-closed paths; regressions `test:token-budget-ecr`, `test:autonomous-loop`, `test:provider-failover-resilience`, `test:llm-provider-port`, `test:gemini` GREEN → slice boundary `npm run test:core` + `npm test`

## Phase 3: MCP Tools + Flips + Hermetic CI (PR 3)

- [x] 3.1 GREEN: constructor (line 1040) wires registry/broker/ECR; `eos.provider.route` handler (1731-1743) → `enrutarMisionReal` preserving `forzarFalloPrimario`; `eos.provider.health` (1754-1763) → `probeProviderHealth`; fail-closed `{status:<CODE>, code, executed:false, sideEffects:'NONE'}`; schemas (963-973) unchanged → GREEN
- [x] 3.2 RED+GREEN: flip `tests/mcp-stdio-smoke.test.js` (MCP-04) + `tests/mcp-readonly-guard.test.js` (GUARD-07) to re-assert fail-closed-without-credentials semantics (no keys ⇒ fail-closed, never simulated success; exercise real path with doubles — not string-swap) → RED then GREEN
- [x] 3.3 GREEN: register `test:real-provider` in `scripts/test-runner.js` + `package.json`; tool count stays 80 (GUARD-08 via `tests/mcp-surface-slim.test.js`), no new tools → GREEN
- [x] 3.4 TRIANGULATE: full hermetic zero-network run — `npm run test:real-provider` + `npm test` GREEN; `npm run verify:strict` gate green; `PRODUCTION_READY` stays `NO`
- [x] 3.5 REFACTOR: optional `docs/model-routing/MODEL_ROUTING.md` openrouter row (if diff allows); cleanup; final `npm run test:core` GREEN

## Archive Status

- **Status**: ARCHIVED (2026-09-24)
- **Fold Target**: `openspec/specs/real-provider-execution/spec.md`
- **Archive Note**: `openspec/changes/archive/eos-real-provider-execution.md`
- **Verification Evidence**: `npm run test:real-provider` (19/19 GREEN), `npm run verify:strict` (914/914 checks GREEN).
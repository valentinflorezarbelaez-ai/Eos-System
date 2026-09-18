# Apply Progress: Real Provider Execution

## Slice 1 — Adapter + Registry + Broker Allowlist (PR 1)

- Branch: `feat/rpe/1-adapter-registry`
- Target: `feature/eos-real-provider-execution` (chain tracker)
- Status: Phase 1 complete — 6/6 tasks done, slice boundary GREEN
- Commits: `c370918` (adapter + tests), `80ee242` (registry routing + env-gate allowlist)

## Outcome

| Task | Cycle | Evidence |
|---|---|---|
| 1.1 RED | adapter describe-blocks | RED `ERR_MODULE_NOT_FOUND` (adapter not yet created) |
| 1.2 GREEN | `src/core/adapters/llm/openrouter-adapter.js` | 15/15 pass |
| 1.3 TRIANGULATE | Bearer-only with injected key; zero secrets in error dumps; no `PRODUCTION_READY` | 20/20 pass |
| 1.4 RED+GREEN | env-gate allowlists (names only) | RED 5 fail → GREEN 26/26; `test:law-vi-broker` 20/20 |
| 1.5 GREEN | registry wiring + `MODEL_ROUTING_MAP`/`resolveModel` + `src/core/index.js` re-export | RED 6 fail → GREEN 34/34 |
| 1.6 REFACTOR | static imports, no order-coupled suites; doubles consolidated | 34/34 pass |

## Verification (final slice boundary)

| Command | Result |
|---|---|
| `node --test tests/eos-rp-real-provider-execution.test.js` | 34/34 pass |
| Regression pack (RP + AD/llm-provider-port + AE/token-budget-ecr + AF/autonomous-loop + AO/provider-failover-resilience + gemini-provider + mcp-surface-slim + AU/law-vi-broker) | 130 pass, 1 skip, 0 fail |
| `npm run test:core` | 20/20 pass |
| `npm run verify:strict` (pre-commit guard, both commits) | PASS |

## Deliverables

- `src/core/adapters/llm/openrouter-adapter.js` — OpenRouterAdapter (extends LlmPort): `getName()==='OPENROUTER'`, injectable `fetchImpl`, `receiveSecret`, key precedence `__runtimeSecret||apiKey||OPENROUTER_API_KEY`, OpenAI-compatible POST to `https://openrouter.ai/api/v1/chat/completions` with `Authorization: Bearer`, AbortController timeout, `response_format` for structured schema, usage + cost from capabilities, redacted error dumps, `probe({timeoutMs, retries:2})` (max_tokens:1, timeout-only retries).
- `src/core/adapters/llm/adapter-registry.js` — registers OpenRouterAdapter; `MODEL_ROUTING_MAP` (frozen) + `resolveModel(matrixId)` → `{adapterKey, model}` or `null` (unmapped ⇒ router `ADAPTER_NOT_FOUND`); `getAdapter` aliases/prefix matching unchanged.
- `src/core/secrets/env-gate.js` — additive names-only allowlist extension: `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `adapter-gemini`, `adapter-openrouter`; custom allowlists stay isolated (not inherited).
- `src/core/index.js` — re-exports `OpenRouterAdapter`, `LlmAdapterRegistry`.
- `tests/eos-rp-real-provider-execution.test.js` — 34 tests across 4 describe blocks (adapter contract, triangulate, env-gate, registry routing).
- `openspec/changes/eos-real-provider-execution/tasks.md` — Phase 1 marked `[x]`; chain strategy recorded as feature-branch-chain.

## Deviations & Notes

- **Work-unit consolidation**: commit `80ee242` carries both registry wiring and env-gate allowlist (with tests) because both impls share the single growing test file; splitting them would leave an intermediate commit with failing tests. Still ≤3 commits total for the slice.
- **Ghost assertion caught during RED**: `Object.isFrozen(undefined)` returns `true` per spec — the initial frozen-map test would have passed for the wrong reason; replaced with contains-keys + frozen assertion.
- **Review size risk**: tasks.md forecasted ~395 changed lines for slice 1; actual is ~920 (749 in unit 1 + 170 in unit 2 + docs). The overage comes from test breadth per the threat matrix (34 tests) and must be accepted as a documented size exception or split further; no behavior was gold-plated.
- No secrets in test code, commits, or receipts (Law VI guard clean; receipt assert `!includes(FAKE_KEY)`).
- Worktree `C:\Users\valen\Documents\Eos system\.worktrees\feature-eos-real-provider-execution` is intentionally NOT removed — PR 2/3 reuse it.

## Next Steps

1. Review `/verify` slice 1, then PR 1 against `feature/eos-real-provider-execution`.
2. Slice 2 (PR 2): Phase 2 tasks 2.1–2.5 — `enrutarMisionReal` in `src/core/provider-router.js`, LlmPort→router error bridge (D4), `probeProviderHealth` (D5), zero-network triangulation.
3. Slice 3 (PR 3): Phase 3 tasks 3.1–3.5 — MCP route/health rewiring, flips re-asserted, `test:real-provider` suite registration (tool count stays 80).
# Design: Real Provider Execution

## Technical Approach

Approach A (proposal §Approach, exploration §5): keep `EOSProviderRouter` additive. Existing `enrutarMision` + `forzarFallo*` simulation stays untouched (test-locked); a NEW `enrutarMisionReal(taskType, request, opts)` dispatches through `LlmAdapterRegistry` → real LlmPort adapter (`GeminiAdapter` existing, `OpenRouterAdapter` new) with ECR gate before any network and `recordUsage` after. Credentials flow via the Law VI secret broker. MCP `eos.provider.route`/`health` become live handles; no new tools (GUARD-08, 80 tools). All new transport behind injectable `fetchImpl`; CI hermetic; `PRODUCTION_READY: NO`.

## Architecture Decisions

### D1: Dispatch layer placement — additive method on the router
| Option | Tradeoff | Decision |
|---|---|---|
| Replace `enrutarMision` body | Breaks simulation contract + MCP handler (line 1736) | **Additive** — new `enrutarMisionReal`; `enrutarMision` and `forzarFallo*` flags byte-identical |
| New dispatcher module | Unauthorized new `src/core` file | Router IS the authorized dispatch layer (proposal file list) |

Rationale: scope law (named files only) and hermetic flag contract (spec: Injection flags preserved).

### D2: Model→adapter mapping in registry (wiring only)
Registry gains `MODEL_ROUTING_MAP` + `resolveModel(matrixId)` returning `{adapterKey, model}`:

| Matrix id | Adapter | OpenRouter model |
|---|---|---|
| `claude-3-5-sonnet` | OPENROUTER | `anthropic/claude-3.5-sonnet` |
| `gpt-4o` | OPENROUTER | `openai/gpt-4o` |
| `gemini-1-5-pro` | GOOGLE_GEMINI | `gemini-1.5-pro` (direct) |

`getAdapter`/prefix matching unchanged; matrix ids never rewritten in the router.

### D3: Credential path — broker-gated, adapter-delivered (Law VI)
| Option | Tradeoff | Decision |
|---|---|---|
| injectToAdapter for both | Requires editing `gemini-adapter.js` (NOT authorized) | **Hybrid**: broker `resolveSecret` presence gate for both; `injectToAdapter` → `receiveSecret` for OpenRouterAdapter; GeminiAdapter keeps native `process.env.GEMINI_API_KEY` read (existing precedent, file untouched) |
| Adapter-native env reads only, no broker | Bypasses Law VI allowlist/redaction | Broker governs BOTH keys: presence + hash only, names allowlisted |

Allowlists (names only): `DEFAULT_ALLOWLISTED_ENV_KEYS += GEMINI_API_KEY, OPENROUTER_API_KEY`; `DEFAULT_ALLOWLISTED_ADAPTERS += adapter-gemini, adapter-openrouter`. AU tests use custom gate arrays — additive extension is safe. Keys never serialized into receipts/errors/state (broker hash + AU redaction + `sanitizeEcrPayload` LONG_B64).

### D4: Error bridge — router taxonomy vs LlmPort codes
| LlmPort error (code) | Router status | Receipt `providerCode` |
|---|---|---|
| — (registry miss) | `ADAPTER_NOT_FOUND` | — |
| — (broker missing env) | `NO_CREDENTIALS` | — |
| — (ECR beforeCall deny) | `BUDGET_EXCEEDED` | — |
| `LlmTimeoutError` (`LLM_TIMEOUT`) | `PROVIDER_TIMEOUT` | `LLM_TIMEOUT` |
| `LlmAuthError` (`LLM_AUTH_DENIED`) | `PROVIDER_UNAVAILABLE` | `LLM_AUTH_DENIED` |
| `LlmRateLimitError` (`LLM_RATE_LIMITED`) | `PROVIDER_UNAVAILABLE` | `LLM_RATE_LIMITED` |
| `LlmProviderError` / `LlmSchemaValidationError` | `PROVIDER_UNAVAILABLE` | `LLM_PROVIDER_FAILURE` / `LLM_SCHEMA_VALIDATION_FAILED` |
| `LlmBudgetError` (`LLM_BUDGET_EXCEEDED`) | `BUDGET_EXCEEDED` | `LLM_BUDGET_EXCEEDED` |

Auth-reject ≠ missing credential: `NO_CREDENTIALS` only when the key is absent; a rejected key is `PROVIDER_UNAVAILABLE` with code preserved. Errors sanitized via AU redaction; full prompt never in receipts/errors.

### D5: Real health probe
`probeProviderHealth(providerId)`: registry resolve (unknown → `PROVIDER_UNAVAILABLE`, no throw) → broker presence → if adapter exposes `probe()` (OpenRouter: minimal `max_tokens:1` call, `fetchImpl`, timeout/retry ×2 → `PROVIDER_TIMEOUT`) use it; Gemini has no probe → governed presence-only (no network; its fetch is not injectable and the file is unauthorized). Returns `status, latency_ms, credentials:{present}, PRODUCTION_READY:'NO'`, no secrets.

### D6: Receipt + MCP envelope
Receipt: `{ proveedorUtilizado, modo: 'PRIMARY'|'FALLBACK' (retry fallback on timeout/provider/rate-limit only), latency_ms, usage: {input_tokens, output_tokens, total_tokens, estimated_cost_usd}, PRODUCTION_READY: 'NO' }`. MCP envelope mirrors existing shape: success `{status:'SUCCESS', executed:true, provider_route}`; fail-closed `{status:'<CODE>', code:'<CODE>', executed:false, sideEffects:'NONE'}`. Tool defs metadata unchanged (sideEffects `READ_ONLY` = workspace semantics; external provider I/O is budget-gated — documented, not a new tool).

## Data Flow

```
eos.provider.route(taskType, prompt)
  → enrutarMisionReal
    1. registry.resolveModel(modelId)      miss → ADAPTER_NOT_FOUND   (zero I/O)
    2. broker.resolveSecret(envKey)        miss → NO_CREDENTIALS       (zero I/O)
    3. broker.injectToAdapter(id, key, adapter)   [OpenRouter: receiveSecret]
    4. ecrGate.beforeCall()                deny → BUDGET_EXCEEDED     (zero I/O)
    5. adapter.infer({messages, model})    ← fetchImpl (timeout, redacted errors)
    6. ecrGate.afterCall({tokensIn, tokensOut, costUnits, provider, intent})
    7. receipt (opaque, redacted, PRODUCTION_READY: NO)

eos.provider.health(providerId)
  → registry.getAdapter → broker presence → adapter.probe({timeoutMs, retries})
  → {status, latency_ms, credentials, PRODUCTION_READY:'NO'}   [unknown → PROVIDER_UNAVAILABLE]
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/core/adapters/llm/openrouter-adapter.js` | Create | LlmPort adapter; OpenAI-compatible `POST {baseUrl}/chat/completions`, `Authorization: Bearer`; injectable `fetchImpl`; `receiveSecret`; `probe()` |
| `src/core/adapters/llm/adapter-registry.js` | Modify | Register OpenRouterAdapter; `MODEL_ROUTING_MAP` + `resolveModel(matrixId)` |
| `src/core/provider-router.js` | Modify | Additive `enrutarMisionReal` + `probeProviderHealth` + error bridge |
| `src/core/secrets/env-gate.js` | Modify | Allowlist key NAMES `GEMINI_API_KEY`, `OPENROUTER_API_KEY`; adapter ids `adapter-gemini`, `adapter-openrouter` |
| `src/mcp-server.js` | Modify | Constructor (1040) wires registry/broker/ECR; handlers (1731-1763) call real path / health |
| `src/core/index.js` | Modify | Re-export `OpenRouterAdapter` |
| `tests/eos-rp-real-provider-execution.test.js` | Create | Router→registry→adapter; ECR gate; Law VI; health; fail-closed; OpenRouter shape; fallback |
| `tests/mcp-stdio-smoke.test.js` | Modify | MCP-04 flip: fail-closed code (CI has no keys) |
| `tests/mcp-readonly-guard.test.js` | Modify | GUARD-07 flip: same |
| `scripts/test-runner.js`, `package.json` | Modify | Register `test:real-provider` |
| `docs/model-routing/MODEL_ROUTING.md` | Modify (optional) | `openrouter` provider row |

## Interfaces / Contracts

`OpenRouterAdapter` (mirrors `GeminiAdapter`): `getName()→'OPENROUTER'`; `receiveSecret(value,{envKey,adapterId})`; `infer(request)`: key precedence `__runtimeSecret || apiKey || process.env.OPENROUTER_API_KEY` (missing → `LlmAuthError`); body `{model, messages, max_tokens: budget_constraints?.max_output_tokens||4096, temperature:0.2, response_format:{type:'json_object'} when structured_output_schema}`; errors: 401/403→`LlmAuthError`, 429→`LlmRateLimitError`, abort→`LlmTimeoutError`, else `LlmProviderError`; usage `{prompt_tokens→input_tokens, completion_tokens→output_tokens, total_tokens}` + computed `estimated_cost_usd`; returns the exact LlmResponse shape (status `COMPLETED`, `latency_ms`, `errors: []`).

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit (new) | OpenRouter request/response/usage redaction | mock `fetchImpl` double; assert `Authorization` reachable only with injected key; no key in receipt/error dump |
| Unit (new) | ECR gate before I/O | exhausted breaker → `BUDGET_EXCEEDED`, double never called |
| Unit (new) | Fail-closed | no keys → `NO_CREDENTIALS`; unmapped task → `ADAPTER_NOT_FOUND`; unknown health → `PROVIDER_UNAVAILABLE`; timeout retries → `PROVIDER_TIMEOUT` |
| Unit (new) | Broker contract | `injectToAdapter('adapter-openrouter','OPENROUTER_API_KEY',adapter)` → `receiveSecret`; receipt hash-only (AU2 parity) |
| Regression | Must stay green | `eos-au-law-vi` (AU), `eos-ae-token-budget-ecr`, `eos-af-autonomous-loop`, `eos-ao-provider-failover`, `eos-ad-llm-provider-port` (AD12), `gemini-provider`, `mcp-surface-slim` (tool count 80) |
| Flips | `mcp-stdio-smoke` MCP-04, `mcp-readonly-guard` GUARD-07 | fail-closed-without-credentials semantics |

CI: zero network (no keys → no request constructed); new suite added to test-runner + optionally `.github/workflows/ci.yml`.

## Threat Matrix

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A — no executable markdown handling |
| Git repository selection | N/A — no `git -C`/path authority |
| Commit state | N/A — no commit automation |
| Push state | N/A — no push automation |
| PR commands | N/A — no PR automation |

No shell/subprocess/VCS boundary. Provider-dispatch adversarial cases (unmapped id, missing creds, exhausted budget, timeout, unknown provider → zero-network fail-closed) are spec'd RED tests in `eos-rp-real-provider-execution.test.js`.

## Migration / Rollout

No migration. Real path is feature-flagless but credential-gated (absent keys ⇒ fail-closed); rollback = revert named files; simulation + flags intact.

## Slice Plan (chained PRs, auto-chain, ≤400 lines each)

| Slice | Start | Finish | Verification |
|---|---|---|---|
| **1. Adapter+registry+wiring** | create `openrouter-adapter.js` | `resolveModel` maps; env-gate names extended | new adapter/registry tests green; `test:law-vi-broker` green |
| **2. Dispatch+router additive path** | `enrutarMisionReal` + ECR gate + error bridge + probe | real path green with mock `fetchImpl`; fallback modes | `eos-rp-real-provider-execution.test.js` (dispatch/credential/budget/health) + ECR/AF/AO suites green |
| **3. MCP tools+tests** | handler rewiring + constructor deps | tool count 80; flips re-asserted | `mcp-stdio-smoke`, `mcp-readonly-guard`, `mcp-surface-slim`; full `npm test` zero-network |

Each slice targets the previous slice branch; each independently reviewable/rollback-able.

## Open Questions

- None blocking. (Optional: include `MODEL_ROUTING.md` doc row in slice 3 — yes if diff allows.)
# Exploration — eos-real-provider-execution

**Status**: DRAFT (explore phase)
**Date**: 2026-09-17
**Scope**: Make EOS execute real model providers instead of the current provider simulation, within existing governance (Law VI secrets, budget ECR, hermetic CI).
**Constraint honored**: Research only — no source edits made during exploration.

---

## 1. Current State — what exists vs. what is fake

EOS has **three parallel LLM worlds**, only one of which performs real network I/O:

| World | Module(s) | Real HTTP? | Used by router? | Production claim |
|---|---|---|---|---|
| **A. Mission router (simulation)** | `src/core/provider-router.js` | No — hardcoded strings only | N/A (it IS the router) | `PRODUCTION_READY: NO` |
| **B. Hexagonal LlmPort adapters** | `src/core/ports/llm-port.js`, `src/core/adapters/llm/gemini-adapter.js`, `src/core/adapters/llm/adapter-registry.js` | Yes (GeminiAdapter) | **No** — registry is dead surface | Adapter `compatibility_status: DISCOVERED_FUNCTIONAL` |
| **C. Mission AD provider port** | `src/core/llm/llm-provider-port.js`, `model-router.js`, `fake-llm-provider.js`, `provider-failover-resilience-router.js`, `provider-health-probe.js` | No — adapters are fail-closed stubs ("live transport not implemented in Mission AD (use AF+)") | No | `PRODUCTION_READY: NO` everywhere |

Plus a **real live precedent**: `src/core/providers/gemini-provider.js` (`queryGemini`, SPEC-0013, native `fetch`, `GEMINI_API_KEY`) and `src/core/mcp/gemini-tool-bridge.js` (`gemini_query` / `gemini_structured` on server `eos-gemini`). This proves real provider calls are already achievable inside EOS governance (mock-fetch tested in `tests/gemini-provider.test.js` and `tests/runners/eos-compute-worker-mission-i.test.js`).

### What is fake today (evidence)

- `src/core/provider-router.js` — `EOSProviderRouter.enrutarMision(tipoTarea)` returns `{ estado: 'SUCCESS', proveedorUtilizado: 'claude-3-5-sonnet' | 'gpt-4o' | 'gemini-1-5-pro', modo: 'PRIMARY'|'FALLBACK' }` with **zero network I/O**; failure is simulated via `forzarFalloPrimario` / `forzarFalloFallback` flags. The hardcoded matrix lives in the constructor (lines 15-20).
- `src/mcp-server.js`:
  - Tool defs `eos.provider.route` / `eos.provider.health` (lines 71-72), schemas (963-973).
  - Handler `eos.provider.route` (1731-1752): only calls the simulation when `tipoTarea`/`taskType` is passed; otherwise returns `NOT_CONFIGURED` with message *"Provider routing is out of scope for local governed MVP (no network credentials)"*.
  - Handler `eos.provider.health` (1754-1763): **always** `NOT_CONFIGURED`.
  - Constructor line 1040: `this.providerRouter = options.providerRouter || new EOSProviderRouter();` — the only router wiring in `src/`.
- Router is exported from `src/core/index.js` (line 52) and listed in the mission-loop readonly allowlist (`src/core/mcp/mission-loop.js` lines 68-69).

### What is real but disconnected (evidence)

- **LlmPort contract** (`src/core/ports/llm-port.js`): abstract `getName()` / `getCapabilities(modelName?)` / `infer(request)`; typed errors `LlmAuthError` (LLM_AUTH_DENIED), `LlmBudgetError`, `LlmSchemaValidationError`, `LlmProviderError`, `LlmTimeoutError` (LLM_TIMEOUT), `LlmRateLimitError` (LLM_RATE_LIMITED).
- **GeminiAdapter** (`src/core/adapters/llm/gemini-adapter.js`): real POST to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`; reads `GOOGLE_AI_API_KEY || GEMINI_API_KEY`; default model `gemini-2.0-flash`; 15s default timeout; `request.messages` with `role: 'system'` → `systemInstruction`; `request.structured_output_schema` → JSON mode with fence stripping; usage accounting `{input_tokens, output_tokens, total_tokens, estimated_cost_usd}`; `latency_ms`; 401/403 → auth, 429 → rate-limit, abort → timeout.
- **LlmAdapterRegistry** (`src/core/adapters/llm/adapter-registry.js`): registers only `GeminiAdapter`; `getAdapter(providerOrModel)` resolves by provider name, `GOOGLE`/`GEMINI` aliases, exact model, or `gemini` prefix; validates adapter implements LlmPort (`getName` + `infer`).
- **Budget ECR** (`src/core/budget/token-budget-circuit-breaker.js`, SPEC-0036/AE): `createTokenBudgetCircuitBreaker` / `createECR`; `recordUsage({tokensIn, tokensOut, tokens, costUnits, provider, intent})`; fail-closed `check()`/`trip()`; HITL-confirmed `reset()`; Law VI sanitize on every payload. Wrapper `src/core/budget/ecr-budget-gate.js` adds `beforeCall`/`afterCall` hooks. The Mission AF loop (`src/core/loop/autonomous-execution-loop.js` lines 240-249, 256-276) already maps `llmResult.usage` into `recordUsage` — i.e., **budget integration for a real `llmPort.complete` result already exists** at the loop level (loop is only wired in tests, never in `src/` app wiring).
- **Law VI secret runtime broker** (`src/core/secrets/secret-runtime-broker.js`, SPEC-0052/AU): `resolveSecret(name)` returns presence + hash only; raw value flows ONLY through `injectToAdapter(adapterId, envKey, adapter)` into `adapter.receiveSecret(value)` / `adapter.inject(value)` / ephemeral `__runtimeSecret`; `attemptPersist` denies secret leaks; currently `PRODUCTION_READY: NO`, Fundacion Δ=0.
- **Env gate allowlists** (`src/core/secrets/env-gate.js`): `DEFAULT_ALLOWLISTED_ENV_KEYS = [EOS_PROVIDER_TOKEN_A, EOS_PROVIDER_TOKEN_B, EOS_PROVIDER_TOKEN_C, EOS_LLM_ADAPTER_TOKEN, EOS_FAKE_PROVIDER_ENV]`; `DEFAULT_ALLOWLISTED_ADAPTERS = [adapter-provider-a/b/c, adapter-llm-failover, adapter-hermetic-fake]`. **Neither `GEMINI_API_KEY` nor `OPENROUTER_API_KEY` is allowlisted** — any broker-based credential path must extend these lists (names only, Law VI).
- **Routing SSOT** (`docs/model-routing/MODEL_ROUTING.md`, consumed by Mission AD): `default: fake`, fallbacks `[ollama, openai, anthropic, gemini]`, intents `chat/codegen/summarize/local/hermetic`. Used only by world C (stubs).
- **Health probe** (`src/core/llm/provider-health-probe.js`, SPEC-0046/AO): `probeProvider(provider)` uses injectable `provider.probe()` / `provider.invoke` presence — **hermetic by design, no network**; the failover router + probe are fully tested in `tests/eos-ao-provider-failover-resilience.test.js`.

### Environment facts (names only — values never exposed)

- `.env` exists at repo root and currently defines exactly **one** key: `GEMINI_API_KEY` (present).
- **`OPENROUTER_API_KEY` is NOT defined.** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `OLLAMA_BASE_URL` are absent.
- No `.env.example` file exists; `LLM_ENV_KEYS` in `llm-provider-port.js` documents expected names: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`/`GOOGLE_API_KEY`, `OLLAMA_BASE_URL`.

---

## 2. Affected Areas — concrete file map (change surface)

Minimal edit surface the proposal must name (FROZEN `src/core/` requires exact files; config.yaml: *"Do not write Fundacion/ or src/core/ unless the human named that exact change"* — the human named it; proposal must record that authorization):

| File | Action | Why |
|---|---|---|
| `src/core/provider-router.js` | MODIFY | Add real execution path: resolve adapter from registry, ECR gate, invoke `infer()`, record usage. Keep `enrutarMision` contract (or deprecate deliberately) — MCP handler line 1736 depends on it. |
| `src/core/adapters/llm/openrouter-adapter.js` | NEW | OpenRouter adapter implementing LlmPort (native `fetch`, OpenAI-compatible `/chat/completions`; single key → Qwen/Hermes/Claude/Gemini/GPT). Zero npm deps (L0). |
| `src/core/adapters/llm/adapter-registry.js` | MODIFY | Register OpenRouter adapter; optionally explicit model→adapter mapping so the router matrix names (`claude-3-5-sonnet`, `gpt-4o`, `gemini-1-5-pro`) resolve to registry entries. |
| `src/mcp-server.js` | MODIFY | Handlers `eos.provider.route` (1731-1752) and `eos.provider.health` (1754-1763): call real path; `NOT_CONFIGURED` only when credentials absent. Constructor (~1040) wiring; schemas (963-973) may gain `prompt`-aware fields. Tool count must stay 80 (GUARD-08) — **do not add new tools**. |
| `src/core/secrets/env-gate.js` | MODIFY | Extend `DEFAULT_ALLOWLISTED_ENV_KEYS` + `DEFAULT_ALLOWLISTED_ADAPTERS` with the real env key NAMES (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`) and adapter IDs if the broker `injectToAdapter` path is chosen. |
| `docs/model-routing/MODEL_ROUTING.md` | MODIFY (optional) | Document `openrouter` provider id + env key; decide whether SSOT default stays `fake` (hermetic CI) with explicit real routing requested per call. |
| `src/core/index.js` | MODIFY (minimal) | Re-export new adapter(s) if the public core surface should expose them. |
| `src/core/ports/llm-port.js` | Unchanged | Contract shared by adapters; no change expected. |
| `src/core/budget/*` | Unchanged | Consume only (`recordUsage` / `ecr-budget-gate`). |
| `src/core/llm/*` (Mission AD world) | Unchanged | Leave stub semantics intact; AD tests lock fail-closed behavior. Router targets the hexagonal LlmPort world, not the AD port. |

---

## 3. Test Map

### Existing tests locking current fake behavior (knock-on, must be updated)

| Test | Locked assertion | Required change |
|---|---|---|
| `tests/mcp-stdio-smoke.test.js` — MCP-04 (lines 48-55) | `eos.provider.route({prompt})` returns `NOT_CONFIGURED`, `executed:false` | Re-assert fail-closed-without-credentials semantics (message/code may evolve to e.g. `MISSING_CREDENTIAL`); CI has no keys, so behavior stays hermetic. |
| `tests/mcp-readonly-guard.test.js` — GUARD-07 (lines 147-158) | same `NOT_CONFIGURED` for `eos.provider.route` | Same flip. |
| `tests/mcp-surface-slim.test.js` (line 62) | slim surface excludes `eos.provider.health` | Keep (no tools added ⇒ unchanged) — but verify after handler rework. |

### Existing tests that already assert the hermetic seams (protection, not knock-on)

- `tests/eos-ad-llm-provider-port.test.js` (AD1-AD15): AD12 asserts stub-with-env still `PROVIDER_UNAVAILABLE` (no network in AD) — **must keep passing; do not touch world C**.
- `tests/eos-ae-token-budget-ecr.test.js` (ECR), `tests/eos-af-autonomous-execution-loop.test.js` (AF loop usage mapping), `tests/eos-ao-provider-failover-resilience.test.js` (AO failover + probe), `tests/eos-au-law-vi-secret-runtime-broker.test.js` (AU broker), `tests/gemini-provider.test.js` (real transport with mock `fetchImpl`), `tests/runners/eos-compute-worker-mission-i.test.js` (tool bridge with mock fetch).
- **No test today covers `EOSProviderRouter`, `LlmAdapterRegistry`, or `GeminiAdapter` directly** — new test surface required.

### New test surface (proposal/tasks to confirm names)

- `tests/eos-rp-real-provider-execution.test.js` (name TBD): router→registry→adapter real path with mock `fetchImpl`; ECR gating (deny before call, usage recorded after); Law VI (key never in receipt/error/state); health probe contract (latency/timeout/retry fields); fail-closed without credentials; OpenRouter request/response shape; budget_constraints passthrough.

### npm script surface

Relevant existing scripts: `test:llm-provider-port`, `test:token-budget-ecr`, `test:autonomous-loop`, `test:provider-failover-resilience`, `test:law-vi-broker`, `test:gemini`, plus the aggregate `scripts/test-runner.js` suite list (line 69+). New script (e.g. `test:real-provider`) must be added to `test-runner.js` list if it should run in `npm test`.

---

## 4. Integration Points

1. **MCP surface**: `eos.provider.route` (taskType + prompt) and `eos.provider.health` (providerId) — the only user-visible entry points. `sideEffects: READ_ONLY` in tool defs must be reconciled with real network calls and cost (may become a documented `NONE`-side-effect external I/O, similar to `eos.workspace.discover` classification discussion).
2. **Mission loop**: both tools are in `MISSION_LOOP_READONLY_ALLOWLIST` (`src/core/mcp/mission-loop.js` 68-69) — real behavior must remain loop-safe (no state mutation).
3. **Budget**: route result → ECR `recordUsage` using adapter `usage.input_tokens/output_tokens/total_tokens/estimated_cost_usd` (GeminiAdapter already computes these). The AF loop precedent (lines 240-249) shows the mapping shape.
4. **Law VI**: two viable governed paths — (a) broker `injectToAdapter` with extended env-gate allowlist (names only), (b) adapter-native `process.env` reads as GeminiAdapter/queryGemini do today (existing precedent). Design phase must pick one; exploration flags that `GEMINI_API_KEY` embedding in the request URL is an existing pattern (precedent in both `gemini-adapter.js` and `gemini-provider.js`).
5. **SSOT (`docs/model-routing/MODEL_ROUTING.md`)**: decide whether real routing is SSOT-driven (needs `openrouter` provider id + SSOT update) or explicit-per-call (router matrix as today). The S6 ratchet (`docs/harness/RATCHET_RITUAL.md`) must not conflict — it is meta-test only.
6. **Core export surface** (`src/core/index.js`): keep router export; add adapter exports only if consumers need them.

---

## 5. Approaches

| # | Approach | Pros | Cons | Effort |
|---|---|---|---|---|
| **A** | Wire `EOSProviderRouter` → `LlmAdapterRegistry` → real LlmPort adapters (Gemini + new OpenRouter), ECR-gated, Law VI credential path; rewire both MCP provider tools | Uses the already-real hexagonal adapter; single coherent execution contract; budget + secrets + health all integrate on one path; keeps AD world untouched | Touches frozen `src/core/provider-router.js` + `mcp-server.js`; must update 2 NOT_CONFIGURED tests; new adapter file | Med |
| **B** | Replace Mission AD stub transports with real ones in `llm-provider-port.js` | Reuses existing `complete()` routing/fallback + AF loop budget wiring | Violates AD12 contract ("stubs never network") → invalidates Mission AD non-claims; heavier test churn; mixes two worlds | High |
| **C** | MCP-only: wire `eos.provider.route`/`health` straight to `queryGemini`/`gemini-tool-bridge` | Smallest diff; real precedent exists | `EOSProviderRouter` stays simulation (change name promises real provider execution); no multi-provider routing, no budget integration, no registry | Low |

### Recommendation

**Approach A**, with the OpenRouter adapter as the multi-model lever (Qwen, Hermes, Claude, Gemini, GPT via one key) and GeminiAdapter as the direct-Google path. Keep `PRODUCTION_READY: NO` (no honesty-test churn), keep CI hermetic (mock `fetchImpl`, no keys in CI), do not add MCP tools (tool count stays 80), do not touch world C. Proposal must record the `src/core/` write authorization (config.yaml rule) and the DIRECT/SDD routing decision per ADR-0010.

---

## 6. Risk Register

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **CI hermeticity** — a real call leaking into CI turns the suite red | High | All real transport behind injectable `fetchImpl`; no key in CI env; NOT_CONFIGURED-style fail-closed behavior without credentials remains asserted |
| R2 | **Law VI leak paths** — API key in URL (Gemini pattern), error bodies, receipts | High | Reuse `sanitizeEcrPayload`/`sanitizeLlmPayload`/AU redaction on every outbound payload; extend env-gate allowlists with names only; never serialize `apiKey` |
| R3 | **Frozen-surface scope creep** — touching `src/core/provider-router.js` requires the named-change authorization | Med | Proposal quotes config.yaml rule + records authorization explicitly; keep the diff to the named files |
| R4 | **NOT_CONFIGURED test locks** — MCP-04 / GUARD-07 flip scope | Med | Flip assertions to fail-closed-without-credentials semantics; keep CI green without keys |
| R5 | **World duplication** — router targeting hexagonal LlmPort while AD port exists | Med | Explicit NON-goal: AD world unchanged; single execution contract documented in design |
| R6 | **OpenRouter availability** — no `OPENROUTER_API_KEY` in `.env` today | Med | Degrade gracefully: OpenRouter adapter reports credential-missing; Gemini path works; document env setup in proposal |
| R7 | **Review budget (400 lines)** — router rework + adapter + MCP + tests may exceed | Med | Forecast in tasks; chained-PR slices (adapter+registry → router → MCP+tests) if needed |
| R8 | **Cost exposure** — real calls cost money; budget ECR must gate before network | Med | `recordUsage` after each call; ECR `check()` before call; document threshold config |
| R9 | **Health semantics** — real health probe needs timeout/retry/latency, current probe is hermetic-assumed | Low | Extend probe contract (`provider.probe()` real implementation with timeout); keep hermetic default |

---

## 7. Behavior Contracts (Given/When/Then samples for the spec phase)

- **Real routing**: Given a registered real provider with credentials, When `eos.provider.route` receives a taskType + prompt, Then the router resolves the adapter, passes the ECR gate, invokes `infer`, records usage, and returns the provider response with latency and usage metadata.
- **Fail-closed**: Given no credentials for any provider, When `eos.provider.route` is called, Then it returns a governed NOT_CONFIGURED/MISSING_CREDENTIAL result (never a simulated success).
- **Budget gate**: Given an ECR with exhausted token budget, When a route is requested, Then the call is DENIED before any network I/O and the receipt carries no secret material.
- **Health**: Given a provider id, When `eos.provider.health` is called, Then it returns credential presence, latency (real probe), and a `PRODUCTION_READY: NO` marker — no secret values.
- **Law VI**: Given an adapter receives an API key, When any receipt/error/state dump is produced, Then the key and key-shaped substrings are redacted.
- **Hermetic CI**: Given CI without provider keys, When the full suite runs, Then zero network calls occur and the suite is green.

---

## 8. Open Questions for the Proposal / Design Phase

1. OpenRouter in scope for this change, or Gemini-only first slice? (User intent mentions Qwen/Hermes/Claude/Gemini/GPT ⇒ OpenRouter is the single-key lever; confirm.)
2. Credential path: broker `injectToAdapter` (extend allowlists) vs. adapter-native `process.env` reads (existing precedent)? 
3. Routing SSOT: per-call explicit routing vs. SSOT-driven (`docs/model-routing/MODEL_ROUTING.md` + `openrouter` id)?
4. Does `eos.provider.route` become the live execution tool (prompt executes against real models) or remain a routing-only advisory tool with a separate execution tool? Boundary with Mission AF loop.
5. TaskType matrix: refresh hardcoded model ids (`claude-3-5-sonnet`, `gpt-4o`, `gemini-1-5-pro`) to current mainstream ids via OpenRouter aliases, or map them in the registry?

---

## Ready for Proposal

**Yes.** Evidence is complete: the simulation, the three disconnected worlds, the real precedent, the test locks, the credential state, and the minimal edit surface are all mapped. The orchestrator should tell the user: the change is feasible at Medium effort under Approach A; `GEMINI_API_KEY` is the only credential present today; adding an `OPENROUTER_API_KEY` is required for the multi-model (Qwen/Hermes) intent; CI stays hermetic; `PRODUCTION_READY` stays `NO`.
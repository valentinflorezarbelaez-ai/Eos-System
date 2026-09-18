# Apply Progress: Real Provider Execution

## Slice 1 — Adapter + Registry + Broker Allowlist (PR 1)

- Branch: `feat/rpe/1-adapter-registry`
- Target: `feature/eos-real-provider-execution` (chain tracker)
- Status: Phase 1 complete — 6/6 tasks done, slice boundary GREEN
- Commits: `c370918` (adapter + tests), `80ee242` (registry routing + env-gate allowlist)

## Outcome (Slice 1)

| Task | Cycle | Evidence |
|---|---|---|
| 1.1 RED | adapter describe-blocks | RED `ERR_MODULE_NOT_FOUND` (adapter not yet created) |
| 1.2 GREEN | `src/core/adapters/llm/openrouter-adapter.js` | 15/15 pass |
| 1.3 TRIANGULATE | Bearer-only with injected key; zero secrets in error dumps; no `PRODUCTION_READY` | 20/20 pass |
| 1.4 RED+GREEN | env-gate allowlists (names only) | RED 5 fail → GREEN 26/26; `test:law-vi-broker` 20/20 |
| 1.5 GREEN | registry wiring + `MODEL_ROUTING_MAP`/`resolveModel` + `src/core/index.js` re-export | RED 6 fail → GREEN 34/34 |
| 1.6 REFACTOR | static imports, no order-coupled suites; doubles consolidated | 34/34 pass |

## Verification (Slice 1 boundary)

| Command | Result |
|---|---|
| `node --test tests/eos-rp-real-provider-execution.test.js` | 34/34 pass |
| Regression pack (RP + AD/llm-provider-port + AE/token-budget-ecr + AF/autonomous-loop + AO/provider-failover-resilience + gemini-provider + mcp-surface-slim + AU/law-vi-broker) | 130 pass, 1 skip, 0 fail |
| `npm run test:core` | 20/20 pass |
| `npm run verify:strict` (pre-commit guard, both commits) | PASS |

## Deliverables (Slice 1)

- `src/core/adapters/llm/openrouter-adapter.js` — OpenRouterAdapter (extends LlmPort): `getName()==='OPENROUTER'`, injectable `fetchImpl`, `receiveSecret`, key precedence `__runtimeSecret||apiKey||OPENROUTER_API_KEY`, OpenAI-compatible POST to `https://openrouter.ai/api/v1/chat/completions` with `Authorization: Bearer`, AbortController timeout, `response_format` for structured schema, usage + cost from capabilities, redacted error dumps, `probe({timeoutMs, retries:2})` (max_tokens:1, timeout-only retries).
- `src/core/adapters/llm/adapter-registry.js` — registers OpenRouterAdapter; `MODEL_ROUTING_MAP` (frozen) + `resolveModel(matrixId)` → `{adapterKey, model}` or `null` (unmapped ⇒ router `ADAPTER_NOT_FOUND`); `getAdapter` aliases/prefix matching unchanged.
- `src/core/secrets/env-gate.js` — additive names-only allowlist extension: `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `adapter-gemini`, `adapter-openrouter`; custom allowlists stay isolated (not inherited).
- `src/core/index.js` — re-exports `OpenRouterAdapter`, `LlmAdapterRegistry`.
- `tests/eos-rp-real-provider-execution.test.js` — 34 tests across 4 describe blocks (adapter contract, triangulate, env-gate, registry routing).
- `openspec/changes/eos-real-provider-execution/tasks.md` — Phase 1 marked `[x]`; chain strategy recorded as feature-branch-chain.

## Deviations & Notes (Slice 1)

- **Work-unit consolidation**: commit `80ee242` carries both registry wiring and env-gate allowlist (with tests) because both impls share the single growing test file; splitting them would leave an intermediate commit with failing tests. Still ≤3 commits total for the slice.
- **Ghost assertion caught during RED**: `Object.isFrozen(undefined)` returns `true` per spec — the initial frozen-map test would have passed for the wrong reason; replaced with contains-keys + frozen assertion.
- **Review size risk**: tasks.md forecasted ~395 changed lines for slice 1; actual is ~920 (749 in unit 1 + 170 in unit 2 + docs). The overage comes from test breadth per the threat matrix (34 tests) and must be accepted as a documented size exception or split further; no behavior was gold-plated.
- No secrets in test code, commits, or receipts (Law VI guard clean; receipt assert `!includes(FAKE_KEY)`).
- Worktree `C:\Users\valen\Documents\Eos system\.worktrees\feature-eos-real-provider-execution` is intentionally NOT removed — PR 2/3 reuse it.

---

## Slice 2 — Real Dispatch + Budget Gate + Health Probe (PR 2)

- Branch: `feat/rpe/2-dispatch`
- Target: `feat/rpe/1-adapter-registry` (chain: PR 2 targets PR 1 branch)
- Status: Phase 2 complete — 5/5 tasks done, slice boundary GREEN
- Commits: `148e13e` (feat: real dispatch path + ECR gate + bridge + probe + tests), docs commit (tasks.md + apply-progress.md)

## Outcome (Slice 2)

| Task | Cycle | Evidence |
|---|---|---|
| 2.1 RED | dispatch/credential/budget/health describe-blocks + helpers (`makeRouter`, `FakeGeminiAdapter`, `geminiSuccessBody`, `abortError`) | RED: 53 run / 34 pass / 19 fail — `TypeError: router.enrutarMisionReal is not a function` / `probeProviderHealth is not a function` |
| 2.2 GREEN | additive `enrutarMisionReal` + `_dispatchAttempt` + `_buildInferRequest` + `_buildSuccessReceipt` in `src/core/provider-router.js`; `enrutarMision`/`forzarFallo*` byte-identical | GREEN 53/53 |
| 2.3 GREEN | LlmPort→router bridge (D4): `llmErrorCode` (code-first, instanceof fallback), `LLM_TO_ROUTER_BRIDGE`, redaction (`sanitizeEcrPayload` + prompt-term splitting) | GREEN 53/53 |
| 2.4 GREEN | `probeProviderHealth(providerId, opts)` (D5): unknown→`PROVIDER_UNAVAILABLE` no throw; broker presence→`NO_CREDENTIALS`; probe timeout/retry ×2; Gemini presence-only | GREEN 53/53 |
| 2.5 TRIANGULATE | zero-network double spy across ALL fail-closed paths (ADAPTER_NOT_FOUND / NO_CREDENTIALS / BUDGET_EXCEEDED) + fallback receipts + sanitized usage | GREEN 53/53; regressions 15/15 + 16/16 + 16/16 |

## Verification (Slice 2 boundary)

| Command | Result |
|---|---|
| `node --test tests/eos-rp-real-provider-execution.test.js` | 53/53 pass |
| `npm run test:core` | 20/20 pass |
| `npm run test:token-budget-ecr` | 15/15 pass |
| `npm run test:autonomous-loop` | 16/16 pass |
| `npm run test:provider-failover-resilience` | 16/16 pass |
| `npm run verify:strict` (pre-commit guard, code commit) | 914 checks / 0 failures — PASS |

## TDD Cycle Evidence (Slice 2)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | `tests/eos-rp-real-provider-execution.test.js` | Unit | ✅ 34/34 | ✅ Written | — | — | — |
| 2.2 | `tests/eos-rp-real-provider-execution.test.js` | Unit | ✅ 34/34 | ✅ 19 tests | ✅ 53/53 | — | — |
| 2.3 | `tests/eos-rp-real-provider-execution.test.js` | Unit | ✅ 34/34 | ✅ 6 bridge tests | ✅ 53/53 | — | — |
| 2.4 | `tests/eos-rp-real-provider-execution.test.js` | Unit | ✅ 34/34 | ✅ 6 probe tests | ✅ 53/53 | — | — |
| 2.5 | `tests/eos-rp-real-provider-execution.test.js` | Unit | ✅ 34/34 | ✅ 1 spy test | ✅ 53/53 | ✅ 19 cases | ✅ Extracted helpers |

### Test Summary (Slice 2)
- **Total tests written**: 19 new (34 → 53)
- **Total tests passing**: 53/53
- **Layers used**: Unit (19)
- **Approval tests** (refactoring): None — no refactoring of existing behavior; legacy `enrutarMision`/`forzarFallo*` preserved byte-identical and covered by existing suites
- **Pure functions created**: 5 (`llmErrorCode`, `bridgeError`, `extractPromptTerms`, `makeRedactor`, `failureEnvelope`)

## Deliverables (Slice 2)

- `src/core/provider-router.js` — additive real dispatch path (imports + module constants `ROUTER_STATUS`/`ADAPTER_ENV_KEYS`/`ADAPTER_IDS`/`RETRYABLE_CODES`/`LLM_TO_ROUTER_BRIDGE` + pure helpers + constructor deps `registry`/`secretBroker`/`ecrGate` + `enrutarMisionReal`/`_dispatchAttempt`/`_buildInferRequest`/`_buildSuccessReceipt`/`probeProviderHealth`). Legacy simulation contract byte-identical.
- `tests/eos-rp-real-provider-execution.test.js` — +19 tests across 4 describe blocks (dispatch+ECR gate 6, error bridge 6, health probe 6, zero-network spy 1), helpers `makeRouter`/`FakeGeminiAdapter`/`geminiSuccessBody`/`abortError`.
- `openspec/changes/eos-real-provider-execution/tasks.md` — Phase 2 (2.1–2.5) marked `[x]`.

## Deviations & Notes (Slice 2)

- **Work-unit consolidation**: implementation landed as ONE cohesive commit (`148e13e`) with its tests — the 19 tests were written together in RED and the additive router code satisfies all of them in a single GREEN pass; hunk-splitting the shared test file/helpers across 3 commits would produce intermediate snapshots with failing tests, violating work-unit green-ness. Slice stays within the review budget documented alongside Slice 1 (~920 lines, size exception noted).
- **Test-mechanics corrections during RED→GREEN** (tests adjusted to REAL adapter/transport mechanics — no production behavior changed):
  - `LLM_BUDGET_EXCEEDED` and `LLM_SCHEMA_VALIDATION_FAILED` bridge cases moved from the OPENROUTER black-box double to the hermetic `FakeGeminiAdapter` (CONTEXT_MASSIVE path). Rationale: `OpenRouterAdapter._post` wraps any thrown fetch-layer error into `LlmProviderError`, so budget/schema codes cannot surface through its transport; Gemini-native errors (schema/budget) reach the router bridge directly — the test now exercises the true adapter-level path.
  - Redaction test split into two layers: router-level prompt stripping (fake Gemini echoing the prompt, unredacted) and adapter-level key redaction (OPENROUTER double echoing the key; OpenRouterAdapter redacts it before the router surfaces it). The router CANNOT redact a key it never sees (Law VI injects values only into the adapter), so key redaction is asserted through the real adapter path.
- **Zero network guaranteed**: fail-closed paths (ADAPTER_NOT_FOUND, NO_CREDENTIALS, BUDGET_EXCEEDED) reach decision before any `adapter.infer`; the spy test proves zero fetch calls. Fallback retry is sanctioned ONLY on LLM_TIMEOUT/LLM_PROVIDER_FAILURE/LLM_RATE_LIMITED and never exceeds primary+fallback (≤2 calls).
- **Missing budget gate fails closed**: no `ecrGate` injected ⇒ `BUDGET_EXCEEDED` ("budget gate unavailable — spend denied"), per spec "Budget gate before network I/O".
- **Redaction contract**: keys/prompts never appear in receipts or error envelopes (asserted with `FAKE_KEY` + a prompt term); `sanitizeEcrPayload` (ECR) applied first, then prompt-term splitting (`[REDACTED]`).
- No secrets in test code, commits, or receipts (Law VI guard clean).

## Next Steps

1. Review this slice (PR 2 against `feat/rpe/1-adapter-registry`).
2. Slice 3 (PR 3): Phase 3 tasks 3.1–3.5 — MCP route/health rewiring, flips re-asserted, `test:real-provider` suite registration (tool count stays 80), full hermetic `npm test`.

---

## Slice 3 — MCP Tool Rewiring + Lock Flips + Hermetic CI (PR 3)

- Branch: `feat/rpe/3-mcp`
- Target: `feat/rpe/2-dispatch` (chain: PR 3 targets PR 2 branch)
- Status: Phase 3 complete — 5/5 tasks done, 16/16 tasks total, slice boundary GREEN
- Commits: code commit (mcp-server + flips + suite registration + MODEL_ROUTING doc), docs commit (tasks.md + apply-progress.md)

## Outcome (Slice 3)

| Task | Cycle | Evidence |
|---|---|---|
| 3.1 GREEN | constructor default wiring + `eos.provider.route` → `enrutarMisionReal` / `eos.provider.health` → `probeProviderHealth` with fail-closed envelopes | GREEN 17/17 MCP suites |
| 3.2 RED+GREEN | MCP-04/GUARD-07 flips (no keys ⇒ NO_CREDENTIALS fail-closed, never simulated) + new MCP-09 double-driven real dispatch | RED 3 fail → GREEN 17/17 |
| 3.3 GREEN | `test:real-provider` registered (package.json script + `SLIM_SUITE_EXCLUDES` opt-in entry) | `npm run test:real-provider` 75/75 |
| 3.4 TRIANGULATE | full hermetic zero-network run | `test:real-provider` 75/75 · `npm test` 1268/1269 (1 pre-existing env failure) · `verify:strict` 914/0 |
| 3.5 REFACTOR | `MODEL_ROUTING.md` openrouter row (Law VI doc-only); cleanup | `npm run test:core` 20/20 |

## Verification (Slice 3 boundary)

| Command | Result |
|---|---|
| `node --test tests/mcp-stdio-smoke.test.js tests/mcp-readonly-guard.test.js` | 17/17 pass (incl. flipped MCP-04, GUARD-07, new MCP-09) |
| `npm run test:real-provider` (RP 53 + MCP 9 + GUARD 8 + SURFACE 5) | 75/75 pass |
| `npm run test:core` | 20/20 pass |
| `npm test` (full slim discovery) | 1268/1269 pass — sole failure `eos-worktree.test.js`: Windows MAX_PATH `git worktree add` from inside the deep `.worktrees\feature-eos-real-provider-execution` path ("Filename too long", git status 128). Pre-existing environment limitation, identical at base `ee0a332`; unrelated to this diff (touches only bin/eos-worktree.js + git mechanics). |
| `npm run verify:strict` (pre-commit guard, code commit) | 914 checks / 0 failures — PASS |

## TDD Cycle Evidence (Slice 3)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `tests/mcp-stdio-smoke.test.js` + `tests/mcp-readonly-guard.test.js` | Unit | ✅ 14/14 MCP + 8/8 GUARD pre-flip | — | ✅ 17/17 | — | — |
| 3.2 | `tests/mcp-stdio-smoke.test.js` + `tests/mcp-readonly-guard.test.js` | Unit | ✅ 14/14 + 8/8 | ✅ GUARD-07, MCP-04, MCP-09 fail (3) | ✅ 17/17 | — | — |
| 3.3 | `tests/mcp-surface-slim.test.js` (+ GUARD-08) | Unit/Integration | ✅ tool count 80 locked | — | ✅ 75/75 via `test:real-provider` | — | — |
| 3.4 | whole hermetic suite | System | ✅ 914 verify checks | — | — | ✅ `npm test` 1268/1269 | — |
| 3.5 | — (docs) | — | ✅ test:core safety net | — | — | — | ✅ MODEL_ROUTING doc |

### Test Summary (Slice 3)
- **Total tests written**: 1 new (MCP-09); 2 flipped (MCP-04, GUARD-07)
- **Total tests passing**: 75/75 targeted; 1268/1269 full slim; 20/20 test:core; 914/914 verify:strict
- **Layers used**: Unit (smoke/guard/slim lock suites) + System (full slim run + strict verify)
- **Approval tests** (refactoring): none — MCP tool schemas (963-973) and the enforced `EOSMCPSchemaValidator` allowlists untouched; legacy simulation `enrutarMision`/`forzarFallo*` preserved (Injection flags keep their deterministic path)
- **Pure functions created**: none (handler wiring only)

## Deliverables (Slice 3)

- `src/mcp-server.js` — constructor default wiring `new EOSProviderRouter({ registry: new LlmAdapterRegistry(), secretBroker: createSecretRuntimeBroker(), ecrGate: createEcrBudgetGate() })` (all three injectable via `options`); `eos.provider.route`: missing taskType → fail-closed `{status:'ADAPTER_NOT_FOUND', code, executed:false, sideEffects:'NONE', PRODUCTION_READY:'NO'}`, explicit Injection flags → preserved simulation `enrutarMision` path, else `enrutarMisionReal(taskCategory, {messages:[{role:'user', content: prompt}]})` with SUCCESS receipt or full fail-closed spread; `eos.provider.health`: `probeProviderHealth(providerId || '')` with SUCCESS/Fail-closed normalization. Schemas and tool catalog byte-identical (80 tools).
- `tests/mcp-stdio-smoke.test.js` — MCP-04 flipped to re-assert fail-closed-without-credentials (`NO_CREDENTIALS` + `code` + `PRODUCTION_READY:'NO'` for both route and health); new MCP-09 exercises the real dispatch path through injected doubles (fetch double + broker env `FAKE_KEY` + ECR gate) asserting exactly one network call, Bearer FAKE_KEY, PRIMARY receipt, success envelope.
- `tests/mcp-readonly-guard.test.js` — GUARD-07 flipped: route with taskType at LEVEL_4 → `NO_CREDENTIALS` fail-closed.
- `scripts/test-runner.js` — `eos-rp-real-provider-execution.test.js` added to `SLIM_SUITE_EXCLUDES` (opt-in convention; TR-01 ≤145 ceiling safe — count shrinks by 1).
- `package.json` — `test:real-provider` script (RP + MCP smoke + GUARD + surface-slim).
- `docs/model-routing/MODEL_ROUTING.md` — `openrouter` provider id + `OPENROUTER_API_KEY` row (document-only, Law VI; values never in repo).

## Deviations & Notes (Slice 3)

- **Enforced schema discovery**: the doc map `TOOL_INPUT_SCHEMAS` (line 973) allows `providerId`, but the ENFORCED `EOSMCPSchemaValidator` strictSchemas (security invariant, `additionalProperties:false`) allows only `provider` for `eos.provider.health` and `tipoTarea/forzarFalloPrimario/prompt/taskType/provider` for `eos.provider.route`. The handler reads `providerId || provider`; tests use the enforced contract param `provider` (schema untouched per task).
- **`forzarFalloFallback` is not schema-legal** on the MCP surface (pre-existing invariant); the handler preserves it for direct-router consumers, and the Injection-flag path is reachable through `forzarFalloPrimario` (spec: Injection flags preserved).
- **Success envelope sideEffects**: `_guarded` reports the declared `toolDef.sideEffects` (`READ_ONLY`) on success; fail-closed envelopes report `'NONE'` via the data spread (matches GUARD-06 pattern).
- **`npm test` full-slim deviation**: `eos-worktree.test.js` fails only inside the nested worktree (Windows MAX_PATH, `git worktree add` status 128, "Filename too long" on deep `openspec/changes/...` paths). Proven environment-only: the suite exercises `bin/eos-worktree.js` git mechanics, untouched by this diff; baseline slice 2 used `test:core` + `verify:strict` as its gate for the same reason. Zero network on all provider paths confirmed by double spies (fail-closed paths never construct a request).
- Test-run side effects (EVD-0060.json, EXECUTIVE_DOSSIER_PRJ-APP-FUERZA.md) regenerated during `npm test` by the PRJ-APP-FUERZA governance fixture were restored to HEAD — not part of this change.
- No secrets in test code, commits, or receipts (Law VI guard clean; MCP-09 asserts Bearer FAKE_KEY only through the double).

## Next Steps

1. Review this slice (PR 3 against `feat/rpe/2-dispatch`) — closes the change.
2. After merge/archive: `sdd-archive` syncs delta specs; full `eos-real-provider-execution` change complete (16/16 tasks).
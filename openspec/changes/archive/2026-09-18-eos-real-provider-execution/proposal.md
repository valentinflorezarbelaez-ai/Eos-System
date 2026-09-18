# Proposal: Real Provider Execution

## Intent

EOS claims frontier-model orchestration, but `EOSProviderRouter` (`src/core/provider-router.js`) returns hardcoded success strings — zero network I/O — and MCP tools `eos.provider.route`/`eos.provider.health` (`src/mcp-server.js`) always return `NOT_CONFIGURED`. The real hexagonal LlmPort world (GeminiAdapter) is disconnected dead surface. This change makes provider execution real under existing governance. **SDD-routed** (ADR-0010; `docs/base-standards.md`).

## Scope

### In Scope
- Router real path: registry resolve → ECR gate → `infer()` → `recordUsage` → receipt
- New `OpenRouterAdapter` (LlmPort, native fetch, OpenAI-compatible; Qwen/Hermes/Claude/Gemini/GPT via one key) + GeminiAdapter direct path
- Registry wiring: register OpenRouter; map matrix ids → adapters
- MCP `route` = real dispatch; `health` = real timed probe; fail-closed without credentials; tool count stays 80 (GUARD-08)
- Law VI: keys via secret broker; env-gate allowlists extended (names only)
- Hermetic doubles: injectable `fetchImpl`; new tests; flip MCP-04/GUARD-07 locks

### Out of Scope (NON-goals)
- Mission AD stubs (`src/core/llm/*`) — untouched (AD12 fail-closed)
- Agent-fabric / terminal loop real execution; UI
- SSOT-driven routing; model-id refresh; production release

## Named Change Authorization

config.yaml: "Do not write `src/core/` unless the human named that exact change." Authorized files:

| File | Why |
|---|---|
| `src/core/provider-router.js` | real execution path |
| `src/core/adapters/llm/adapter-registry.js` | wiring only |
| `src/core/adapters/llm/openrouter-adapter.js` | NEW adapter |
| `src/core/secrets/env-gate.js` | allowlist NAMES only |

`src/core/ports/llm-port.js` consumed, unchanged; `src/core/llm/llm-provider-port.js` deliberately NOT touched (AD stub); `src/mcp-server.js` unfrozen; `src/core/index.js` minimal; tests.

## Capabilities

**New** — `real-provider-execution`: real routing → registry → adapters → ECR + Law VI → MCP route/health tools; hermetic CI.
**Modified** — None (world-C semantics immutable; behavior lands in the new capability delta).

## Approach

Approach A (exploration §5). Router resolves adapter from registry; ECR `check()` before any network; `infer()`; `recordUsage` after; receipt: `proveedorUtilizado`, `modo`, `latency_ms`, `usage`, `PRODUCTION_READY: NO`; `forzarFallo*` retained for hermetic tests. Open questions → assumptions: (1) OpenRouter in scope — YES; (2) keys via Law VI broker `injectToAdapter` + extended allowlists; (3) per-call routing, SSOT default stays `fake`; (4) `route` = live execution, `health` = real timed probe (timeout/retry/latency); (5) matrix ids mapped in registry, refresh deferred. All transport behind injectable `fetchImpl`.

## Affected Areas

Authorization list above + `src/mcp-server.js` (handlers ~1731-1763, wiring ~1040, schemas ~963-973), `src/core/index.js` (re-export), tests `mcp-stdio-smoke` / `mcp-readonly-guard` / `mcp-surface-slim` (verify) + new `tests/eos-rp-real-provider-execution.test.js`, optional `docs/model-routing/MODEL_ROUTING.md`.

## Risks (exploration register, prioritized)

| Risk | L | Mitigation |
|---|---|---|
| R1 CI hermeticity | High | injectable `fetchImpl`; no CI keys; fail-closed asserts |
| R2 Law VI leak paths | High | AU redaction; keys never serialized |
| R3 frozen-scope creep | Med | authorization recorded; named files only |
| R6 no OPENROUTER_API_KEY | Med | graceful missing; Gemini path works; setup doc |
| R8 cost exposure | Med | ECR gates before I/O; usage recorded after |
| R7 review budget (800 lines, auto-chain) | Med | chained slices: adapter+registry → router → MCP+tests |
| R4/R5/R9 test locks, world dup, probe | Med/Low | fail-closed flips; AD NON-goal; timed probe |

## Rollback Plan

Real path feature-flagged; rollback = flag off or revert named files; simulation intact; no migration/data.

## Dependencies

`GEMINI_API_KEY` present (`.env`); `OPENROUTER_API_KEY` needed for multi-model intent (graceful if absent); zero npm deps (L0).

## Success Criteria

- [ ] Real path exercised against a live provider in dev mode
- [ ] Hermetic CI green; zero real calls (mock `fetchImpl`)
- [ ] `PRODUCTION_READY` stays `NO`
- [ ] ECR denies spend before any network I/O (proven)
- [ ] Zero plain secrets in receipts/errors/state

## Epistemic Status

| Claim | Status |
|---|---|
| Router simulation-only; MCP tools NOT_CONFIGURED | VERIFIED |
| GeminiAdapter real; registry unconnected; env facts | VERIFIED |
| Approach A fits | ASSUMPTION |
| Law VI broker path; per-call routing; live tools; probe contract | ASSUMPTION |
| AD world immutable | VERIFIED (AD12 lock) |
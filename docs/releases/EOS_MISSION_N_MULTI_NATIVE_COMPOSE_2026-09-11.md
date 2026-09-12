# Mission N — Multi-native tool composition (SPEC-0019) — 2026-09-11

## Summary

Proves **composition** of Gemini + Stitch + Browser QA natives in a single `executeComputeRun`. Additive API: `MULTI_NATIVE_COMPOSE_ORDER` and `buildMultiNativeComposeToolCalls(opts)` emit gemini_query → stitch_generate_screen → browser_qa_run. Dispatch reuses the existing sequential loop (SPEC-0012/0014/0017/0018); SPEC-0019 documents compose semantics (order, soft QA mid-chain, mid-chain infra abort).

## Routing

| Signal | Path |
| --- | --- |
| compose helper | `buildMultiNativeComposeToolCalls` → ordered toolCalls |
| `gemini_*` / `eos-gemini` | `executeGeminiTool` (SPEC-0014) |
| `stitch_*` / `eos-stitch` | `executeStitchTool` (SPEC-0017) |
| `browser_qa_run` / `eos-browser-qa` | `executeBrowserQaTool` (SPEC-0018) |
| other | `McpToolDispatcher` |

## Worker delta

- Small additive exports + SPEC-0019 comments on the dispatch loop.
- No new npm deps; no new dispatcher; natives already routed.

## Verification (box harness)

- `node --test tests/runners/eos-compute-worker-mission-n.test.js` → **11 PASS**, 1 SKIP
- Slim exclude `eos-compute-worker-mission-n.test.js` + `npm run test:compute-worker-n`

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps

## Branch

`grok/mission-n-multi-native-compose` from `main@5c5a1bd290b1da4623d72bf57acd013f5cbc49d8`

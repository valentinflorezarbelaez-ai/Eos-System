# Mission M — Browser QA compute-worker tool bridge (SPEC-0018) — 2026-09-11

## Summary

Native Browser QA tool `browser_qa_run` / `serverName=eos-browser-qa` is first-class in `executeComputeRun` via Mission K `browser-qa-runner` → `executeBrowserQaTool`. Soft QA reports (`ok:false`) are delivered without aborting applyDiff; infra errors fail-closed as `BROWSER_QA_TOOL_FAILED`.

## Routing

| Signal | Path |
| --- | --- |
| `browser_qa_run` / `eos-browser-qa` | `executeBrowserQaTool` (+ `browserQaClientImpl`) |
| `stitch_*` / `eos-stitch` | `executeStitchTool` (SPEC-0017) |
| `gemini_*` / `eos-gemini` | `executeGeminiTool` (SPEC-0014) |
| other | `McpToolDispatcher` |

## Compat

`eos-compute-worker-mission-l.test.js` builtin discovery assertion made **additive** so later natives (Browser QA) do not break Mission L suite.

## Verification (box harness)

- `node --test tests/runners/eos-compute-worker-mission-m.test.js` → **12 PASS**, 1 SKIP
- L+M together: 24 PASS, 2 SKIP
- Slim exclude + `npm run test:compute-worker-m`

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps

## Branch

`grok/mission-m-browser-qa-worker-bridge` from `main@43a5059b46d214fec8a09933cb09d5c9c6457a42`

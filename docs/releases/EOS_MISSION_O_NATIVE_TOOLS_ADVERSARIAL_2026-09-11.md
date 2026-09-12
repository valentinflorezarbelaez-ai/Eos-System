# Mission O — Native-tools adversarial suite (SPEC-0020) — 2026-09-11

## Summary

Adversarial red-team of eos-compute-worker natives (Gemini / Stitch / Browser QA / multi-native compose). Suite `eos-compute-worker-mission-o-adversarial.test.js` proves fail-closed mid-chain, unknown-lookalike MCP gate, invalid/oversize args, mixed-plan dispatcher requirement **before** apply, compose-builder integrity, custody seal-only-on-success, dispatcher non-invocation on pure-native compose, and `serverName` spoof routing honesty.

## Routing

| Signal | Path |
| --- | --- |
| compose helper | `buildMultiNativeComposeToolCalls` → ordered toolCalls |
| `gemini_*` / `eos-gemini` | `executeGeminiTool` (SPEC-0014) |
| `stitch_*` / `eos-stitch` | `executeStitchTool` (SPEC-0017) |
| `browser_qa_run` / `eos-browser-qa` | `executeBrowserQaTool` (SPEC-0018) |
| unknown lookalike (not builtin, not eos-* server) | `MCP_TOOL_DISPATCHER_REQUIRED` (pre-loop) |
| mixed native + non-native, no dispatcher | `MCP_TOOL_DISPATCHER_REQUIRED` before any native / apply |
| `serverName: eos-gemini` + non-builtin tool | classified native → `UNKNOWN_GEMINI_TOOL` → `GEMINI_TOOL_FAILED` |

## Worker delta

**No.** Existing I/L/M/N routing already fail-closes the cases above. Suite asserts behavior; no worker patch.

## Verification (box harness)

- `cd /workspace/mission-o/harness && node --test tests/runners/eos-compute-worker-mission-o-adversarial.test.js` → **13 PASS**, 1 SKIP, 0 FAIL
- Slim exclude `eos-compute-worker-mission-o-adversarial.test.js` + `npm run test:compute-worker-o`

## Cases

| ID | Result |
| --- | --- |
| O1 PRODUCTION_READY=NO | PASS |
| O2 unknown lookalike → MCP_TOOL_DISPATCHER_REQUIRED | PASS |
| O3 gemini infra mid-compose + rollback | PASS |
| O4 stitch infra after gemini; toolOutputs length 2 | PASS |
| O5 browser QA infra after gemini+stitch | PASS |
| O6 soft QA does not fail-close | PASS |
| O7 invalid/oversize stitch args | PASS |
| O8 missing/oversize gemini prompt | PASS |
| O9 mixed plan, no dispatcher, 0 apply (natives do not run first) | PASS |
| O10 compose builder / frozen order | PASS |
| O11 custody seals only on success | PASS |
| O12 dispatcher spy count 0 on pure-native | PASS |
| O13 serverName spoof routing honesty | PASS |
| O14 optional live | SKIP |

## Governance

- PRODUCTION_READY=NO | Fundacion Δ=0 | AT_CEILING | Antigravity-first | zero new npm deps
- SLIM ≤145 via exclude-from-slim (no TR-01 raise)

## Branch

`grok/mission-o-native-tools-adversarial` from `main@2d8f6d779523c1eee23e0b04178c3310ba4a026b`

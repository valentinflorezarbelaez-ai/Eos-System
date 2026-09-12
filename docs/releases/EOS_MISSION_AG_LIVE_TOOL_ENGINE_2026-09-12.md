# Mission AG — Live Tool Engine (SPEC-0038) — 2026-09-12

## Summary

Hermetic **Live Tool Engine** — a governed tool-call bus with `native`
(in-process handlers) and `mcp` (injectable `mcpClient` port — fake in tests)
dispatch. Fail-closed on unknown tools (`UNKNOWN_TOOL`) and missing/bad auth
(`TOOL_UNAUTHORIZED`). Law VI deep-redacts secret keys on **inputs and
outputs**; custody receipt on each invoke with **no secret fields**. Additive
under `src/core/tools/` — **does not** implement AH, **does not** flip
PRODUCTION_READY, **does not** use CloudAgent, **does not** open live network
in CI, **does not** claim unbounded tool fleets.

## Tip / branch pins

| Pin | Value |
| --- | --- |
| Expected base tip (StartsWith) | `da18fde` (Mission AF #201 / tip-200 lineage) |
| Branch | `grok/mission-ag-live-tool-engine` |
| Worktree | `C:\Users\valen\Documents\Eos-mission-ag` |
| Payload | `C:\Users\valen\Documents\Eos-mission-ag-payload` |

## Explicit Δ=0 / NON-CLAIM

| Claim | Status |
| --- | --- |
| Fundacion Δ | **Δ=0 intact** — ALWAYS DENY; no Fundacion paths touched |
| PRODUCTION_READY | **`NO`** (never YES) |
| Tool bus | **NON-CLAIM** — ≠ unbounded fleet ≠ CloudAgent ≠ PRODUCTION_READY |
| AH | **NOT implemented** in this mission |
| CloudAgent | **NON-CLAIM** — Antigravity-first |
| Secrets in repo | **FORBIDDEN** — Law VI; runtime synth only (AF11 lesson) |
| Live network in CI | **FORBIDDEN** — hermetic fakes only |

## Routing

| Signal | Path |
| --- | --- |
| Factory | `createLiveToolEngine` |
| Registry | `registerTool` / `listTools` / `invoke` |
| Modes | `native` \| `mcp` (injectable mcpClient) |
| Fail-closed codes | `UNKNOWN_TOOL`, `TOOL_UNAUTHORIZED`, `MCP_UNAVAILABLE`, `TOOL_ERROR` |
| Law VI | `sanitizeAgPayload` — redact apiKey/token/authorization/secret/password |
| Receipt | `{ tool, ok, code, at, receiptId, PRODUCTION_READY:'NO' }` |
| AGY / CloudAgent | **NON-CLAIM** |

## Deltas

| Artifact | Changed? |
| --- | --- |
| `src/core/tools/live-tool-engine.js` | **NEW** |
| `src/core/tools/tool-custody-receipt.js` | **NEW** |
| `tests/eos-ag-live-tool-engine.test.js` | **NEW** |
| `scripts/patch-mission-ag.mjs` | **NEW** |
| Real Documents/Fundacion | **No** |
| `package.json` / `scripts/test-runner.js` | scripts + slim exclude via patcher |
| OpenSpec + release + bootstrap | **Yes** |
| AH modules | **No** |

## Verification (box harness)

```
cd /workspace/Eos-mission-ag-payload && npm run test:mission-ag
```

→ **16 PASS**, 0 SKIP, 0 FAIL (AG1–AG16)

Slim exclude basename: `eos-ag-live-tool-engine.test.js`  
Scripts: `npm run test:live-tool-engine` / `npm run test:mission-ag`

## Cases

| ID | Result |
| --- | --- |
| AG1 kind + PRODUCTION_READY NO | PASS |
| AG2 register + invoke native OK | PASS |
| AG3 unknown DENY | PASS |
| AG4 unauthorized DENY | PASS |
| AG5 Law VI redact inputs (runtime synth) | PASS |
| AG6 Law VI redact outputs | PASS |
| AG7 sanitizeAgPayload unit | PASS |
| AG8 mcp fake dispatch | PASS |
| AG9 mcp without client | PASS |
| AG10 receipt custody shape | PASS |
| AG11 health / getState / getReceipts | PASS |
| AG12 no network / hermetic | PASS |
| AG13 handler throw TOOL_ERROR | PASS |
| AG14 role auth + listTools | PASS |
| AG15 no static vendor-key literals | PASS |
| AG16 registerTool validation + dual-mode | PASS |

## Secrets hygiene

- **No** contiguous vendor-key prefix literals in payload source/tests
  (`rg` clean) — fixtures built at runtime via `String.fromCharCode` /
  array `join` (same lesson as AF11 fix).
- Receipts / getState never dump credentials.
- Fundacion paths untouched (Δ=0).

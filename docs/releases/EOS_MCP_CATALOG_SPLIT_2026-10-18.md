# EOS MCP Catalog Split — 2026-10-18

**Status:** EXECUTED (Phase 0 modularization slice)
**PRODUCTION_READY:** NO
**Fundacion:** Δ=0 (untouched)

---

## 1. What changed

| Surface | Before | After |
| --- | ---: | ---: |
| `src/mcp-server.js` | 2,777 lines / 131 KB | **1,806 lines** |
| `src/mcp/catalog.js` | did not exist | **990 lines** |
| Public API | `CANONICAL_TOOLS`, `listTools` | unchanged (re-exported) |
| Tools | 80 canonical / 14 Tier A | **80 / 14 unchanged** |

Moved to `src/mcp/catalog.js`:

- Canonical tool catalog (`CANONICAL_TOOLS`).
- Tier A surface set (`TIER_A_TOOL_NAMES`).
- Surface resolution (`resolveMcpSurface`, `listTools`).
- Input schemas (`TOOL_INPUT_SCHEMAS`).

The monolith imports the catalog and re-exports the same public API, so existing
consumers and tests continue to work without changes.

---

## 2. Dead-code purge

Removed 5 unused files / **243 lines**:

| Path | Why removed |
| --- | --- |
| `src/mcp/router.js` | Imported by `mcp-server.js` but never instantiated or called. |
| `src/mcp/handlers/audit-verifier-handler.js` | Only used by the unused mock router. |
| `src/mcp/handlers/evidence-handler.js` | Only used by the unused mock router. |
| `src/mcp/handlers/governance-handler.js` | Only used by the unused mock router. |
| `src/mcp/handlers/mission-handler.js` | Only used by the unused mock router. |

`src/mcp/guardrail-sandwich.js` was retained: it is exported by `src/core/index.js`
and exercised by `tests/l8-write-barrier-adversarial.test.js`.

---

## 3. Verification

```text
CANONICAL_TOOLS          80
Tier A listTools         14
Full listTools           80
MCP targeted tests       9/9 pass
Default suite            1460/1460 pass
Strict verifier          913/913 pass
Coverage                 lines 73.97% · branches 67.01% · functions 73.58%
```

Coverage moved from 73.58/67.02/72.62 to **73.97/67.01/73.58** after removing
0%-covered phantom files and splitting the catalog.

**Non-claim:** this is the first modularization slice, not full MCP decomposition.
The `handleToolCall` dispatch switch remains in `src/mcp-server.js` and is the next target.

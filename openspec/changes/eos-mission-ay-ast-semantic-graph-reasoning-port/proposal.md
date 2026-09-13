# Proposal — Mission AY: AST & Semantic Graph Reasoning Port (SPEC-0056)

## Why

Ladder 18 ranks **AST & Semantic Graph Reasoning Port** after AX MEASURED
(Sovereign Developer Engine). Developers need structural reasoning over
allowlisted source (symbols, imports/exports, calls, dependency edges)
with sealed receipts and fail-closed DENY — without claiming a full IDE,
language-server marketplace, or CloudAgent code intelligence SaaS.

## What

1. `src/core/developer-engine/ast-semantic-port.js` —
   `createAstSemanticPort` / `reason`; kind
   `eos-ast-semantic-graph-reasoning-port`; phases PARSE → BUILD_GRAPH → QUERY;
   hermetic JS extractor (no acorn/babel); optional AX/AG injectable hooks;
   codes frozen in `AY_CODES`; `AY_PRODUCTION_READY='NO'`.
2. Thin `semantic-graph.js` + `reasoning-receipt.js` (sha256) +
   `ast-policy-gate.js` — graph helpers, sealed receipts, DENY helpers.
3. Suite `tests/eos-ay-ast-semantic-port.test.js` (AY1–AY18)
   hermetic; no network; slim-exclude;
   `npm run test:ast-semantic-port` / `test:mission-ay`.
4. OpenSpec change + release report + bootstrap + idempotent patcher.

## NON-CLAIM

- AST & Semantic Graph Port ≠ full IDE
- ≠ language-server marketplace / ≠ CloudAgent code intelligence SaaS
- not AZ/BA/BB
- Fundacion Δ=0; AY_PRODUCTION_READY=NO; Antigravity-first
- L17 CLOSED never reopen; AX MEASURED; compose/extend AG + inject into AX
  — do not rewrite AX/AG modules into this payload

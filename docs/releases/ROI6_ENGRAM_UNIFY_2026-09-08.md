# ROI6 Engram Path/Contract Unify 2026-09-08

Branch: cursor/roi6-engram-unify
Base main tip: 88c9847e9f74d57d81dd57d14c095c9c957da930 (ROI5 #34 merged)
Scope: ROI6 ONLY - LAST ROI on global ladder; after push stop
PRODUCTION_READY: NO

## Goal

Unify local Engram path + envelope contract so governed use has one SSOT memory root and one envelope schema; fail-closed on drift; do not invent fake FTS5 SQLite.

## Design choice (path that won)

Canonical local root: .eos/engram/memory.jsonl

Why:
- .eos/ is already the local runtime control-plane root (custody, ledger, satellites) and is gitignored.
- Separates mutable memory from docs/intelligence/ documentation tree.
- Legacy default docs/intelligence/akasha_memory.jsonl is retired fail-closed (LEGACY_AKASHA); opt-in allowLegacyRedirect maps to SSOT for migration helpers only.
- External MCP engram (PATH binary via config/mcp/eos-mcp.ssot.json, tools mem_save / mem_context) remains Golden Path for real FTS5/SQLite - unchanged.

## Envelope

Schema id: eos.engram.envelope/v1

Aligns Gentleman mem_save fields with EosMemory seal fields. Honest markers: backend eos-memory-jsonl, fts5 false. Claiming fts5 true on local envelopes is DENY.

## MCP tool hardening

eos.pleroma.akasha.engram is a thin adapter through EosMemory + contract when fts5IndexingActive is false.
When fts5IndexingActive is true: status FTS5_NOT_AVAILABLE_USE_EXTERNAL_ENGRAM - no consecration, no fake FTS5 (matches DO_NOT_BUILD register).

## Deliverables

- src/core/memory/engram-contract.js
- Wired src/core/memory.js, src/core/adapters/gentleman-sdd-bridge.js
- Hardened src/mcp-server.js tool #74
- scripts/engram-verify.js + engram:verify / test:roi6
- tests/roi6-engram-unify.test.js (+ updated mcp engram test)
- ADR-0016
- verify:strict light check

## Verify

npm run test:roi6
npm run engram:verify
npm run verify:strict

## Freeze

- LAST ROI - no further ROIs after push
- No merge this change set
- PRODUCTION_READY remains NO
- External target delta=0
- DEFER dirty unstaged
- Unit tests do not require live engram CLI

# Proposal — EOS S5 MCP/tool KEEP inventory

## Why

Ladder 7 K5: P5 closed MCP catalog count (80==CANONICAL_TOOLS); falta inventario KEEP + candidatos a poda ("¿Qué puedo dejar de hacer?") con candado verify. Espejo P6/Q6 inventory pattern sobre superficie MCP/tool.

## What (this change only)

1. Docs inventory KEEP (57) vs prune-candidate (23) from catalog SSOT + dead/orphan register
2. `scripts/lib/mcp-tool-keep-lock.js` fail-closed + verify:strict 3g14
3. `test:s5` TDD
4. OpenSpec change + freeze note
5. NON-CLAIM inventory ≠ executed prune; prune solo PO-named

## Routing

**SDD** (mirror P6 inventory + Q6 verify lock in one S5 step per L7 DoD).

## NON-goals

- Executed prune / silent delete
- PRODUCTION_READY flip
- S6
- Fundacion / App Fuerza
- Open/merge PR
- New schemas (AT_CEILING)

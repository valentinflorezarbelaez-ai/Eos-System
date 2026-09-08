# ROI2 — scripts/engine prune (quarantine)

**Date:** 2026-09-08 (America/Bogota)  
**Branch:** `cursor/roi2-engine-prune`  
**Base main tip:** `36d85b590b5f5f0c73b7b8911e9e0492062e6e4c`  
**Action:** `REVERSIBLE_QUARANTINE` (moved, not deleted)  
**Fundacion:** untouched (Δ=0)  
**PRODUCTION_READY:** NO (unchanged)  
**Scope:** ROI2 ONLY (no ROI3+)

## Evidence summary

| Metric | Before | After |
| --- | ---: | ---: |
| `scripts/engine/*.js` files | 99 | 19 |
| `scripts/engine` LOC (approx lines) | 16792 | 4348 (archived 12444) |
| Companion tests relocated | — | 88 → `archive/quarantine/engine-roi2/tests/` |
| Engines quarantined | — | 80 → `archive/quarantine/engine-roi2/scripts-engine/` |

Machine inventory: `archive/quarantine/engine-roi2/INVENTORY.json`  
Manifest: `archive/quarantine/engine-roi2/MANIFEST.md`  
Lock test: `tests/engine-roi2-canonical-inventory.test.js`

## Classification method

1. Enumerate `scripts/engine/*.js`
2. Mark **KEEP** if referenced by any of:
   - `scripts/verify-eos.js` required-file list
   - `package.json` scripts (CI governance-gates / operator entrypoints)
   - live `src/` or `bin/` imports (MCP mission bridge → `mission-ledger.js`)
   - LIDR/OpenSpec discipline (`spec-driven-product-loop.js`)
3. Everything else with only test-only (or zero) consumers → quarantine with companion tests

## Canonical keep set (19)

See `INVENTORY.json` `keep_canonical`. Includes verify strategy/factory/loop surface, independent verification, mission ledger, discovery/audit/x-watch package scripts, and OpenSpec product loop.

## Explicit non-goals / freeze follow-through

- Do **not** start ROI3+
- Do **not** merge to `main` in this change set
- Do **not** set `PRODUCTION_READY=YES`
- Do **not** touch Fundacion
- Leave ROI1 DEFER dirty files unstaged
- Mission loop, write-barrier, MCP SSOT, and agent entrypoints remain intact

## Restore

Move file(s) from `archive/quarantine/engine-roi2/scripts-engine/` back to `scripts/engine/` and restore companion tests from `archive/quarantine/engine-roi2/tests/` into `tests/`. Update the inventory lock test keep list.

## Adjacent caller remap

`scripts/cli/eos.js` (`eos:legacy` / cursor harness) still needs six research engines for improve/polyglot/a11y/seo/mcp/provider commands. Those imports were remapped to `archive/quarantine/engine-roi2/scripts-engine/*` rather than restoring them into live `scripts/engine/`.

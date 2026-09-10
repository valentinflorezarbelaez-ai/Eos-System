# Dirty DEFER triage ritual (Ladder 8 T8 / K8)

**Status:** ACTIVE local governed ritual  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0  
**Mode:** NON-MUTATING catalog (default) — mass delete FORBIDDEN without PO names

## 1. Purpose

Keep tip honesty ops clean by classifying untracked porcelain as **PROMOTE / DEFER / IGNORE / DISCARD** without vibe force-commits or silent deletes.

## 2. Legal modes

### 2.1 CATALOG (default)

Inventory porcelain; write disposition table; leave DEFER unstaged; may PROMOTE triage SSOT only.

### 2.2 IGNORE

Add precise `.gitignore` entries for confirmed noise (lab experiments, KAIZEN dump copies, unreferenced binaries). Files may remain on disk. **IGNORE ≠ DISCARD.**

### 2.3 PO_NAMED_DISCARD

Only when PO names exact paths to delete. Fail-closed if unnamed mass delete attempted.

## 3. Verify / gate

- Lock: `scripts/lib/dirty-defer-triage-lock.js`
- Gate: `scripts/ci/dirty-defer-triage-gate.js` (NON-MUTATING)
- Evidence: `docs/releases/EOS_T8_DIRTY_DEFER_TRIAGE_2026-09-09.md`
- Closeout: `docs/releases/EOS_LADDER_8_CLOSEOUT_2026-09-09.md`

## 4. FORBIDDEN

- Mass delete of DEFER without PO names
- Force-commit secrets (`.env`, keys, tokens)
- Fundacion / App Fuerza mutation
- Claiming DISCARD executed when disposition is DEFER/IGNORE
- Silent MCP/tool prune

## 5. Non-claims

- Triage ≠ PRODUCTION_READY flip
- IGNORE ≠ file deleted from disk
- Catalog ≠ permission to delete
- L8 closeout ≠ production autonomy

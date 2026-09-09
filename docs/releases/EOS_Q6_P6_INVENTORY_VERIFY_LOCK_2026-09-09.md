# EOS Q6 Candado verify de inventario P6 - 2026-09-09

**Branch:** cursor/eos-q6-p6-inventory-verify-lock
**Base main tip:** 9a58bc49aca538d23fc1ed0c8b398ad3b3e9492f (post-Q5 #65)
**Alcance:** Q6 ONLY (Ladder 5 K6) — EOS-only
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**App Fuerza:** sin cambios
**Merge:** NO (push + compare only)

## 1. Goal (Q6 / K6 DoD)

1. verify:strict falla cerrado si falta el doc de inventario P6 o sus secciones requeridas.
2. Espejo del patron de candado P3 hooks-install / P5 mcp-catalog.
3. test:q6 TDD: fixture temporal sin doc/secciones -> FAIL; doc real -> PASS.
4. **NON-CLAIM:** inventory != executed prune (no borrar/mover/cuarentena candidatos).
5. Nota de freeze; PRODUCTION_READY permanece NO.

## 2. Gap

- test:p6 ya existia (y Q2 lo metio en CI seam-pack).
- Historicamente verify:strict no tenia candado de existencia/secciones del inventario P6.

## 3. Design

- scripts/lib/p6-inventory-lock.js — auditP6InventoryLock fail-closed
- scripts/verify-eos.js — import + P6_INVENTORY_REQUIRED_PATHS + audit 3g8
- tests/eos-q6-p6-inventory-verify-lock.test.js — TDD
- package.json test:q6

Secciones minimas: ## 2. Inventory method (evidence); ## 4. Ranked prune CANDIDATES (inventory only); ## 9. Non-claims; PRODUCTION_READY; NON-CLAIM.

## 4. NON-CLAIM

- inventory != executed prune
- Este cambio no elimina, mueve ni cuarentena ningun candidato P6.
- Q2 CI test:p6 permanece; este candado es el path lock de verify:strict.
- No se afirma PRODUCTION_READY=YES.

## 5. Freeze note

- Q6 listo para review (push/compare); tip pin de freeze no se mueve aqui.
- Dictamen sin cambio; Fundacion Delta=0; DEFER dirty unstaged.

## 6. Verify

npm run test:q6
npm run test:p6
npm run verify:strict

## 7. Deliverables

1. scripts/lib/p6-inventory-lock.js
2. Wiring en scripts/verify-eos.js
3. tests/eos-q6-p6-inventory-verify-lock.test.js + test:q6
4. Esta evidencia + nota en EOS_FREEZE_GATE_STATUS.md
5. Dirty DEFER sin stage

## 8. Non-claims

- PRODUCTION_READY=NO
- Fundacion Delta=0
- inventory != executed prune
- sin merge sin PO
- sin App Fuerza

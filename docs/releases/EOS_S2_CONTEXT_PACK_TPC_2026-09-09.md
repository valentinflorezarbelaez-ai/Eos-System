# EOS S2 Context Pack TPC index + lifecycle — 2026-09-09

**Branch:** `cursor/eos-s2-context-pack-tpc`  
**Base main tip:** `aa28b59efa55fcfa2d42804ddcc84fb67f30b9e8` (post S1 #75)  
**Alcance:** S2 ONLY (Ladder 7 K2) — EOS-only  
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (sin tocar)  
**App Fuerza:** sin cambios  
**Merge:** NO (push + compare only)  
**Schemas:** AT_CEILING 35/35 — **sin** nuevos `docs/schemas/**/*.json`

## 1. Goal (S2 / K2 DoD)

1. Índice canónico Tool / Prompt / Context en `docs/harness/CONTEXT_PACK_TPC.md`.
2. Política de lifecycle: inject / compact / discard / reset / revisit-on-model-change (texto de política; **no** orquestador runtime).
3. Pointer a adopción LIDR: `docs/releases/EOS_LIDR_HARNESS_WORKSHOP_ADOPTION_2026-09-09.md`.
4. `verify:strict` falla cerrado si falta el índice o sus secciones requeridas (`scripts/lib/context-pack-lock.js`).
5. TDD `test:s2` + evidencia ES + nota de freeze.
6. **NON-CLAIM:** index ≠ runtime context completo / index != full runtime context engineering.
7. Gaps Spec-Boot (`frontend-standards`, `documentation-standards`, `development_guide`) marcados **DEFER/MISSING** — sin inventar cuerpos.

## 2. Gap cerrado

- TPC y compactación existían en doctrine (rules / LIDR adoption) pero **no** había índice Context Pack base ni candado de existencia en verify:strict.
- Ladder 7 audit S2 lo ordenó post S1 tip refresh.

## 3. Design entregado

| Artefacto | Rol |
| --- | --- |
| `openspec/changes/eos-s2-context-pack-tpc/` | OpenSpec FIRST (proposal/design/tasks/spec) |
| `docs/harness/CONTEXT_PACK_TPC.md` | SSOT TPC index + lifecycle |
| `scripts/lib/context-pack-lock.js` | Fail-closed existence + needles (mirror p6-inventory-lock) |
| `scripts/verify-eos.js` | Import + REQUIRED_PATHS + audit **3g10** |
| `tests/eos-s2-context-pack-tpc.test.js` + `test:s2` | TDD |
| Esta evidencia + freeze note | Spanish release SSOT |

## 4. NON-CLAIM

- **index ≠ runtime context completo** (index != full runtime context engineering / orchestrator).
- Este cambio **no** inyecta/compacta/descarta/resetea ventanas de contexto en vivo.
- **PRODUCTION_READY=NO**; Fundacion Delta=0; sin App Fuerza.
- Sin nuevos schemas JSON (AT_CEILING).
- No instala Spec-Boot completo; no afirma que el workshop LIDR "resuelve cualquier problema".
- No implementa S3–S6.

## 5. Freeze note

- S2 listo para review (push/compare); **main_tip de freeze no se mueve** aquí (tip refresh fue S1).
- Dictamen sin cambio; Fundacion Delta=0; DEFER dirty unstaged.

## 6. Verify

```text
npm run test:s2
npm run verify:strict
```

## 7. Deliverables checklist

1. OpenSpec `openspec/changes/eos-s2-context-pack-tpc/`
2. `docs/harness/CONTEXT_PACK_TPC.md`
3. `scripts/lib/context-pack-lock.js` + wire verify:strict
4. `tests/eos-s2-context-pack-tpc.test.js` + `package.json` `test:s2`
5. Esta evidencia + nota en `EOS_FREEZE_GATE_STATUS.md`
6. Pointer mínimo AGENTS.md / CLAUDE.md → índice

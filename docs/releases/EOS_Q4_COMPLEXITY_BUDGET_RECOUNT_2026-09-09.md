# EOS Q4 Complexity budget recount / honesty lock - 2026-09-09

**Branch:** `cursor/eos-q4-complexity-budget-recount`
**Base main tip:** `00dd01d74cf0d301a01f210bd9bab7becb4af4db` (post-Q3 #63)
**Alcance:** Q4 ONLY (Ladder 5 K4) - EOS-only, **budget honesty** (sin prune)
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push + compare only; HITL en navegador)

---

## 1. Goal (Q4 / K4 DoD)

1. Documentar y **bloquear** la regla de conteo de schemas (top-level vs recursive vs registered).
2. Actualizar `docs/governance/COMPLEXITY_BUDGET.json` para que `current_usage.schemas` y `status` coincidan con el conteo real bajo la regla elegida.
3. Evidencia en espanol bajo `docs/releases/`; nota de freeze; tests TDD (`test:q4`) fail-closed si el budget != filesystem bajo la regla.
4. **NON-CLAIM:** la cuarentena opcional de candidatos P6 **NO** se ejecuto (PO no nombro rutas exactas).
5. `PRODUCTION_READY` permanece **NO**.

## 2. Counting rule (locked)

| Campo | Valor bloqueado |
| --- | --- |
| `counting_rule.schemas.id` | `recursive_docs_schemas_json` |
| Glob | `docs/schemas/**/*.json` |
| Incluye | top-level + `docs/schemas/local/**` |
| Excluye | (ninguno) |
| Status rule | `WITHIN_BUDGET` si current < max; `AT_CEILING` si current === max; `OVER` si current > max |

**Por que recursive (no top-level / registered):**

- La sonda K4 del Ladder 5 audit midio **35** archivos JSON recursivos (32 top-level + 3 `local/`) frente al claim `schemas: 33` / `WITHIN_BUDGET`.
- `docs/schemas/local/*.json` siguen siendo schemas bajo `docs/schemas/` y formaban parte de la discrepancia.
- No existe un registro SSOT registered mantenido para el budget de schemas.

Alternativas **no** seleccionadas (documentadas en el JSON):

- `top_level_only` -> 32 -> WITHIN_BUDGET
- `registered` -> sin SSOT

---

## 3. Before / after

| Metrica | Before (deshonesto) | After (Q4 lock) |
| --- | --- | --- |
| Regla | (no documentada) | `recursive_docs_schemas_json` |
| `current_usage.schemas` | **33** | **35** |
| `budgets.max_schemas` | 35 | 35 (sin cambio) |
| `status` | WITHIN_BUDGET | **AT_CEILING** |
| Conteo FS top-level | 32 | 32 |
| Conteo FS `local/` | 3 | 3 |
| Conteo FS recursive | 35 | **35** (fuente de verdad) |

Breakdown `local/` (incluidos en el conteo):

- `docs/schemas/local/direction.local.schema.json`
- `docs/schemas/local/hitl-receipt.local.schema.json`
- `docs/schemas/local/mission-package.local.schema.json`

## 4. NON-CLAIM — PO quarantine

- **Cuarentena / prune PO: NO ejecutada.**
- P6 inventory (`docs/releases/EOS_P6_COMPLEXITY_PRUNE_INVENTORY_2026-09-09.md`) sigue siendo inventory-only (32 candidatos).
- PO **no nombro** rutas exactas -> **FORBIDDEN** mover/borrar/cuarentenar candidatos en este change set.
- Ningun archivo de `src/core` ni schema fue eliminado, movido o cuarentenado por Q4.
- Explicit: **quarantine NOT executed** / **cuarentena NO ejecutada**.

---

## 5. Freeze note

Tras push de esta rama (merge requiere PO / HITL):

- Q4 honesty lock queda listo para review: regla recursive bloqueada; budget `35/35` `AT_CEILING`.
- Tip pin de freeze (`main_tip`) **no** se mueve en Q4 (tip refresh es mision aparte / Q1-style).
- Dictamen: COMPLETE_FOR_LOCAL_GOVERNED_USE; **PRODUCTION_READY: NO**.
- Siguiente trabajo Q5+ no se inicia en silencio en esta rama.

---

## 6. Entregables

1. `docs/governance/COMPLEXITY_BUDGET.json` — counting_rule + schemas 35 + status AT_CEILING
2. `tests/eos-q4-complexity-budget-recount.test.js` + `package.json` script `test:q4`
3. Esta evidencia
4. Nota Q4 en `docs/releases/EOS_FREEZE_GATE_STATUS.md`
5. Dirty tree **DEFER** (untracked sin stage)

## 7. Verificacion

```text
npm run test:q4
```

## 8. Dirty / fuera de alcance

- DEFER dirty untracked: sin stage
- Sin tocar Fundacion / App Fuerza
- Sin ejecutar P6 prune
- Sin abrir/merge PR desde este bot (push branch only)

## 9. Non-claims

- Budget honesty != PRODUCTION_READY.
- AT_CEILING != obligacion de prune inmediato.
- Inventory P6 != prune ejecutado.
- Cuarentena opcional **NO** ejecutada (PO no nombro paths).
- Sin App Fuerza. Sin mutacion Fundacion (Delta=0).
- Sin Q5+ scope en esta rama.
- Compare-only; merge requiere PO / HITL navegador.
- PRODUCTION_READY permanece NO.

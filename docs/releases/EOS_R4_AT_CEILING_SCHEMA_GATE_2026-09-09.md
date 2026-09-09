# EOS R4 AT_CEILING schema pressure gate — 2026-09-09

**Branch:** `cursor/eos-r4-at-ceiling-schema-gate`
**Base main tip:** `a4917bbc296eb570dd881cf63a6c627fd2faa233` (post-R3 #70)
**Alcance:** R4 ONLY (Ladder 6 K4) — gate/política fail-closed; **sin** prune P6
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**Merge:** NO (push + compare only; HITL en navegador)

---

## 1. Goal (R4 / K4 DoD)

1. Gate fail-closed mientras `COMPLEXITY_BUDGET.status` es **AT_CEILING** (schemas 35/35, `counting_rule` = `recursive_docs_schemas_json` sobre `docs/schemas/**/*.json`).
2. `verify:strict` **DENIEGA** si el conteo FS recursive **>** `max_schemas` (presión por schema nuevo / OVER).
3. `verify:strict` **DENIEGA** si `status` declara `WITHIN_BUDGET` estando ya en techo (deshonesto).
4. Documentar política: **nuevos schemas bajo `docs/schemas` están forbidden / prohibidos mientras AT_CEILING** salvo que PO suba `max_schemas` o haga prune.
5. Tests TDD (`test:r4`) con fixtures temporales; evidencia en español; nota freeze.
6. **NON-CLAIM:** Gate ≠ executed prune. No se ejecuta cuarentena P6 (PO no nombró rutas).

---

## 2. Qué deniega el gate

| Condición | Resultado |
| --- | --- |
| Conteo recursive `docs/schemas/**/*.json` > `budgets.max_schemas` | DENY (OVER / additional schema pressure) |
| `status=WITHIN_BUDGET` y count >= max | DENY (dishonest ceiling) |
| `counting_rule` ausente o id ≠ `recursive_docs_schemas_json` | DENY |
| `current_usage.schemas` ≠ conteo FS (regla locked) | DENY |
| `status` ≠ derivado (WITHIN/AT_CEILING/OVER) | DENY |
| Honest `AT_CEILING` con count === max (35/35) | ALLOW |
| Honest `WITHIN_BUDGET` con count < max | ALLOW |

Implementación: `scripts/lib/complexity-budget-lock.js` → `auditComplexityBudgetLock` cableado en `scripts/verify-eos.js` (bloque 3g9, solo `--strict`).

---

## 3. Política AT_CEILING (operadores)

Mientras el budget esté **AT_CEILING**:

- **FORBIDDEN** añadir archivos `*.json` nuevos bajo `docs/schemas/` (incluye subdirs como `local/`).
- Para liberar cupo: PO debe **subir** `budgets.max_schemas` **o** **prunear/cuarentenar** schemas existentes (paths exactos nombrados por PO).
- Este change set **no** sube el max y **no** ejecuta prune.

---

## 4. NON-CLAIM

- **Gate ≠ executed prune** / gate != prune.
- Inventory P6 ≠ quarantine.
- doctor ≠ verify (R4 no toca doctor/fusion-light).
- Cuarentena PO de candidatos P6: **NO ejecutada** (sin paths nombrados).
- Sin cambios App Fuerza / Fundacion / `src/core` kernel.
- `PRODUCTION_READY` permanece **NO**.

---

## 5. Freeze note

Tras push de esta rama (merge requiere PO / HITL):

- R4 gate listo para review: fail-closed AT_CEILING schema pressure en verify:strict.
- Tip pin de freeze (`main_tip`) **no** se mueve en R4 (tip refresh es misión aparte).
- Dictamen: COMPLETE_FOR_LOCAL_GOVERNED_USE; **PRODUCTION_READY: NO**.
- R5+ no se inicia en silencio en esta rama.

---

## 6. Entregables

1. OpenSpec: `openspec/changes/eos-r4-at-ceiling-schema-gate/`
2. `scripts/lib/complexity-budget-lock.js` + wire `scripts/verify-eos.js`
3. `tests/eos-r4-at-ceiling-schema-gate.test.js` + `package.json` `test:r4`
4. Policy en `docs/governance/COMPLEXITY_BUDGET.json` (`policy.at_ceiling_new_schemas=FORBIDDEN`)
5. Esta evidencia + nota en `EOS_FREEZE_GATE_STATUS.md`
6. Dirty tree **DEFER** (untracked sin stage)

## 7. Verificación (agente)

```text
npm run test:r4
# EXIT=0 — 11 pass / 0 fail

npm run test:q4
# EXIT=0 — 6 pass / 0 fail

npm run verify:strict
# EXIT=0 — Checks Passed: 660 | Failures: 0
# complexity-budget-lock VERIFIED:
#   COMPLEXITY_BUDGET.json loaded
#   counting_rule locked recursive_docs_schemas_json
#   schema count within max (35/35)
#   status honesty AT_CEILING
#   current_usage.schemas matches filesystem
# STATUS: VERIFIED
```

Surrogate contract (no HTTP): `node scripts/verify-eos.js --strict --json` includes `type: complexity-budget-lock` checks; clean tree → no failures from this gate.

## 8. Dirty / fuera de alcance

- DEFER dirty untracked: sin stage
- Sin tocar Fundacion / App Fuerza
- Sin raise de `max_schemas`
- Sin P6 prune/quarantine

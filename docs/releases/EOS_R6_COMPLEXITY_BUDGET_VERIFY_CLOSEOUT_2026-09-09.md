# EOS R6 Candado verify complexity-budget closeout — 2026-09-09

**Branch:** `cursor/eos-r6-complexity-budget-verify-closeout`
**Base main tip:** `2e0463991c326beb0c04212296cbd9f63915bb36` (post-R5 #72)
**Alcance:** R6 ONLY (Ladder 6 K6 residual) — CI seal + meta-tests + NON-CLAIM; **no** reimplement lock
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)
**PRODUCTION_READY:** NO
**Fundacion:** Delta=0 (sin tocar)
**App Fuerza:** sin cambios
**Merge:** NO (push + compare only; HITL en navegador)

---

## 1. Goal (R6 / K6 residual DoD)

1. Documentar honestamente **K6 CLOSED_BY_R4**: el candado verify:strict (`auditComplexityBudgetLock` / `complexity-budget-lock.js` / bloque 3g9) ya existía desde R4.
2. Sellar CI seam-pack con **`test:r4`** + **`test:r5`** para que los locks Ladder 6 no regresen sin señal CI (espejo R2/Q2).
3. Meta-tests `test:r6` + evidencia + nota freeze: cierre Ladder 6 R1–R6 **pendiente de este merge**.
4. **NON-CLAIM:** candado ≠ executed prune. `PRODUCTION_READY=NO`.

---

## 2. Residual vs already-done

| Item | Estado |
| --- | --- |
| verify:strict fail-closed si status/count/counting_rule ≠ FS | **Already-done R4** (`scripts/lib/complexity-budget-lock.js` + verify 3g9) |
| NON-CLAIM gate ≠ prune (R4 evidence) | **Already-done R4** |
| `test:r4` / `test:r5` package scripts | **Already-done R4/R5** |
| OpenSpec K6 CLOSED_BY_R4 + R6 residual | **R6 (this PR)** |
| CI seam-pack `test:r4` + `test:r5` + contract/assert/m5/GHA | **R6 (this PR)** |
| `tests/eos-r6-...` + `test:r6` | **R6 (this PR)** |
| Spanish evidence + freeze R1–R6 pending merge | **R6 (this PR)** |
| doctor/fusion-light complexity-budget presence | **SKIPPED** (barato≠necesario; R4 doctor≠verify; evita bloat TR-01) |

---

## 3. Entregables

1. OpenSpec: `openspec/changes/eos-r6-complexity-budget-verify-closeout/`
2. CI: `.github/workflows/ci.yml` seam-pack + `docs/governance/CI_CD_CONTRACT.md` + `scripts/ci/assert-gha-contract.js`
3. Tests: m5 / GHA-008 / r2 list mirrors + `tests/eos-r6-complexity-budget-verify-closeout.test.js` + `npm run test:r6`
4. Esta evidencia + nota freeze
5. Dirty tree **DEFER** (untracked sin stage)

---

## 4. NON-CLAIM

- **K6 CLOSED_BY_R4** — R6 closeout ≠ reimplementación de `complexity-budget-lock`.
- **candado ≠ executed prune** — no se ejecuta cuarentena P6; no se sube `max_schemas`.
- Inventory ≠ quarantine.
- CI seam listing ≠ GH branch-protection enforcement (sigue RULE_CREATED_NOT_ENFORCED).
- doctor ≠ verify (R6 no toca doctor/fusion-light).
- Fundacion Delta=0; App Fuerza untouched.
- `PRODUCTION_READY` permanece **NO**.

---

## 5. Freeze note

Tras push de esta rama (merge requiere PO / HITL):

- Ladder 6 **R1–R6 close pending this merge** (cierre pendiente de este merge).
- Tip pin de freeze (`main_tip`) **no** se mueve en R6 (tip refresh es misión aparte).
- Dictamen: COMPLETE_FOR_LOCAL_GOVERNED_USE; **PRODUCTION_READY: NO**.

---

## 6. Verify (agent-executed)

| Command | Exit | Notes |
| --- | --- | --- |
| `npm run test:r6` | 0 | 8/8 PASS |
| `npm run test:r4` | 0 | 11/11 PASS |
| `npm run test:r5` | 0 | 8/8 PASS |
| `npm run test:r2` / `test:m5` / GHA / TR-01 | 0 | r2 4/4; m5 4/4; GHA 8/8; TR-01 PASS (121 `<` 130) |
| `npm run verify:strict` | 0 | 679 checks; complexity-budget-lock VERIFIED (R4 wire intact) |

---

## 7. CI scripts added

- seam-pack: `npm run test:r4`, `npm run test:r5`
- package: `test:r6`

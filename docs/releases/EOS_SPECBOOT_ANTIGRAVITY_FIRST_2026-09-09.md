# EOS SpecBoot cycle + Antigravity-first — 2026-09-09

**Branch:** `cursor/eos-specboot-antigravity-first`  
**Base main tip:** `d86ab231aeaebd4e3a5dec9e52bb9dbc8ef0986c` (post S4 #78)  
**Alcance:** SpecBoot harness SSOT + Antigravity-first — EOS-only  
**Dictamen:** COMPLETE_FOR_LOCAL_GOVERNED_USE (sin cambio)  
**PRODUCTION_READY:** NO  
**Fundacion:** Delta=0 (sin tocar)  
**App Fuerza:** sin cambios  
**Merge:** NO (push + compare only)  
**Schemas:** AT_CEILING 35/35 — **sin** nuevos `docs/schemas/**/*.json`  
**CloudAgent:** fuera del path por defecto (configs Cursor **no** borradas)

## 1. Goal

1. Ciclo SpecBoot LIDR como SSOT de harness: `docs/harness/SPECBOOT_CYCLE.md`.
2. Modo operativo **Antigravity-first**: `docs/harness/ANTIGRAVITY_FIRST.md` (runtime AGY/Gemini/eos-workstation; CloudAgent demoted).
3. Espejos delgados en `.agents/skills/{ff,propose,apply,verify,archive,commit}` → `.cursor/commands/*.md` (AGY carga `.agents/skills`; sin fork de cuerpos).
4. Candado `scripts/lib/specboot-cycle-lock.js` + wire verify:strict **3g13**.
5. `test:specboot-agy` + evidencia ES + nota freeze (sin mover main_tip).
6. **NON-CLAIM:** no prohibe edición local en Cursor IDE; solo saca CloudAgent del path por defecto.

## 2. Gap cerrado

- Había skills/commands parciales, OpenSpec, menciones AGY y fusion ground truth, pero **no** un SSOT de ciclo + política Antigravity-first con candado verify ni espejos AGY para ff/propose/apply/verify/archive/commit.

## 3. Design entregado

| Artefacto | Rol |
| --- | --- |
| `openspec/changes/eos-specboot-antigravity-first/` | OpenSpec FIRST |
| `docs/harness/SPECBOOT_CYCLE.md` | Ciclo + mapa skills/commands |
| `docs/harness/ANTIGRAVITY_FIRST.md` | Runtime policy AGY-first |
| `.agents/skills/{ff,propose,apply,verify,archive,commit}/SKILL.md` | Thin mirrors |
| `scripts/lib/specboot-cycle-lock.js` | Fail-closed lock |
| `scripts/verify-eos.js` | Import + REQUIRED_PATHS + audit **3g13** |
| `tests/eos-specboot-antigravity-first.test.js` + `test:specboot-agy` | TDD |
| Esta evidencia + freeze note | Spanish release SSOT |

## 4. Gaps de instalación restantes (operador)

1. **OpenSpec CLI** (opcional) — aliases `opsx:*`; no requerido L0.
2. **agy-daemon** — `agy-daemon.cmd install --name eos-workstation` (Admin) si se necesita HITL remoto; `agy-daemon.cmd status`.
3. Confirmar binario local `agy` antes de sesiones SpecBoot.

## 5. NON-CLAIM

- CloudAgent launches **out of default path** ≠ ban de edición local Cursor IDE.
- Thin skill mirrors ≠ fork de cuerpos SpecBoot.
- SpecBoot cycle map ≠ nuevo motor/orquestador.
- **PRODUCTION_READY=NO**; Fundacion Delta=0; sin App Fuerza; sin schemas nuevos.

## 6. Freeze note

- Listo para review (push/compare); **main_tip de freeze no se mueve** aquí.
- DEFER stubs (`docs/frontend-standards.md`, `docs/documentation-standards.md`, `docs/development_guide.md`) quedan **dirty unstaged**.

## 7. Verify

```text
npm run test:specboot-agy
npm run verify:strict
```

## 8. Deliverables checklist

1. OpenSpec `openspec/changes/eos-specboot-antigravity-first/`
2. `SPECBOOT_CYCLE.md` + `ANTIGRAVITY_FIRST.md` + pointers
3. AGY skill mirrors
4. `specboot-cycle-lock.js` + verify wire
5. `test:specboot-agy`
6. Esta evidencia + nota en `EOS_FREEZE_GATE_STATUS.md`

# EOS — Cursor Learn (puntero vivo)

* **Estado:** VIVO
* **Alcance:** Método de trabajo de agentes en Cursor
* **No es:** Copia del curso, ni cambio de arquitectura o contratos

---

## Fuente de verdad

El curso oficial es la fuente de verdad. Este archivo **solo apunta**; no lo duplica (una copia se queda vieja).

- ES: [https://cursor.com/es/learn](https://cursor.com/es/learn)
- EN: [https://cursor.com/learn](https://cursor.com/learn)

Leer el curso ahí. Aplicar el bucle abajo dentro de las reglas EOS ya vigentes.

---

## Bucle de trabajo EOS

1. **Entender el codebase primero.** Inspeccionar layout, contratos y convenciones antes de editar.
2. **Planear en pasos verificables de forma independiente.** Cada paso debe poder comprobarse solo.
3. **Gestionar el contexto.** Meter en sesión lo mínimo útil; no inflar prompts ni reglas always-on.
4. **TDD cuando el comportamiento es el contrato.** Rojo → verde → refactor; evidencia ejecutable, no afirmación.
5. **Debuggear con evidencia de runtime.** Causa raíz, no síntomas. Logs, tests y repro > hipótesis.
6. **Misma barra de review que código humano.** Diff chico, intención clara, sin atajos de “lo escribió un agente”.
7. **Convenciones repetidas → reglas o skills cortos.** Preferir `.cursor/rules` o skills puntuales, no reglas gigantes always-on.

---

## Patrones de fallo

| Anti-patrón | Por qué falla |
| --- | --- |
| Cambiar antes de entender | Rompe contratos y convenciones que no se leyeron |
| Shippear sin verificar | Claim sin evidencia; EOS lo rechaza |
| Scope creep | Mezcla objetivos; el diff deja de ser auditable |
| Tests verdes ≠ corrección | Verde puede ser mock, scope incompleto o contrato mal leído |
| Inflar rules | Ruido always-on; el curso y las skills puntuales alcanzan |

---

## Fuera de alcance (explícito)

Este documento **no** cambia:

- arquitectura L0 / L1
- contratos MIS (Mission OS, ATS, FSM, HITL)
- `CONSTITUTION.md`, CORE, `PRJ-FUNDACION`, ni gates de autorización

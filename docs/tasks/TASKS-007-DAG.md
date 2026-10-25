# TASKS-007: ATOMIC DAG BREAKDOWN
## Pipeline de Tareas Atómicas para el Motor de Desarrollo Universal

---

```mermaid
graph TD
    T01["TASK-007-01: Implement AgentRoleMatrix.ts in src/core/domain/models/"]
    T02["TASK-007-02: Implement UniversalDevelopmentEngine.ts in src/core/application/"]
    T03["TASK-007-03: Integrate 'develop' Command into scripts/eos-cli.mjs"]
    T04["TASK-007-04: Add Interactive Universal Engine Lab in C:\\Users\\valen\\Eos-System (index.html & js/eos.js)"]
    T05["TASK-007-05: Run verify-landing.mjs & Deploy to https://eos-system-ten.vercel.app/"]
    T06["TASK-007-06: Execute verify-strict.ps1 in Eos-System-1 (Exit Code 0) & Commit"]

    T01 --> T02
    T02 --> T03
    T03 --> T04
    T04 --> T05
    T05 --> T06
```

---

### TABLA DE DEFINICIÓN DE TAREAS

| ID | Descripción | Insumo | Criterio de Hecho |
|---|---|---|---|
| `TASK-007-01` | Crear `AgentRoleMatrix.ts` | `types.ts`, Constitución Sec. 3 | 8 roles definidos con capacidades y verificaciones |
| `TASK-007-02` | Crear `UniversalDevelopmentEngine.ts` | Modelos de dominio | Motor de 21 pasos ejecutable con EARS/BDD |
| `TASK-007-03` | Integrar comando `develop` en CLI | `eos-cli.mjs` | `npm run eos -- develop "<prompt>"` operativo |
| `TASK-007-04` | Agregar simulador universal al portal web | `index.html`, `js/eos.js` | Laboratorio interactivo activo en `#desarrollo-universal` |
| `TASK-007-05` | Auditoría y despliegue a producción | `deploy-portal.mjs` | `verify-landing.mjs` 6/6 Pass & Vercel HTTP 200 |
| `TASK-007-06` | Verificación estricta de plano de control | `verify-strict.ps1` | Exit Code 0 & commit sellado en `Eos-System-1` |

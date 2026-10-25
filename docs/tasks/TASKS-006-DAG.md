# TASKS-006: ATOMIC DAG BREAKDOWN
## Pipeline de Tareas Atómicas para EOS CLI y Portal en Vivo

---

```mermaid
graph TD
    T01["TASK-006-01: Build Pure L0 scripts/eos-cli.mjs in Eos-System-1"]
    T02["TASK-006-02: Register 'npm run eos' in Eos-System-1 package.json"]
    T03["TASK-006-03: Enhance C:\\Users\\valen\\Eos-System (index.html & js/eos.js) with Dual-Track, FDIR & Fleet 10/10"]
    T04["TASK-006-04: Run verify-landing.mjs in C:\\Users\\valen\\Eos-System (6/6 Pass)"]
    T05["TASK-006-05: Deploy C:\\Users\\valen\\Eos-System to https://eos-system-ten.vercel.app/"]
    T06["TASK-006-06: Run verify-strict.ps1 in Eos-System-1 (Exit Code 0) & Commit"]

    T01 --> T02
    T02 --> T03
    T03 --> T04
    T04 --> T05
    T05 --> T06
```

---

### TABLA DE DEFINICIÓN DE TAREAS

| ID | Descripción | Criterio de Hecho |
|---|---|---|
| `TASK-006-01` | Construir `scripts/eos-cli.mjs` | Comandos `status`, `dual-track`, `sentinel`, `fdir`, `sync`, `deploy` ejecutables |
| `TASK-006-02` | Registrar `"eos": "node ./scripts/eos-cli.mjs"` | `npm run eos -- status` operativo con exit code 0 |
| `TASK-006-03` | Enriquecer portal web `C:\Users\valen\Eos-System` | Comandos `dualtrack:orchestrator` y `attestation:chain` activos |
| `TASK-006-04` | Auditoría de invariantes de portal | `verify-landing.mjs` pasa 6/6 |
| `TASK-006-05` | Despliegue en producción de portal | `npx vercel --prod --yes` con HTTP 200 en `eos-system-ten.vercel.app` |
| `TASK-006-06` | Verificación estricta del plano de control | `verify-strict.ps1` exit code 0 y commit sellado |

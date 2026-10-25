# SPEC-006: EOS CORE CLI ENGINE & LIVE WEB PORTAL SPECIFICATION
## Formal Requirements (IEEE 830 / ISO 29148 Standard)

---

### 1. REQUISITOS FUNCIONALES (PATRONES EARS)

* **FR-01 (Event-Driven):**
  CUANDO el operador invoque `npm run eos -- <command>` en el plano de control, EL SISTEMA `scripts/eos-cli.mjs` DEBE ejecutar deterministamente la subrutina solicitada (`status`, `dual-track`, `sentinel`, `fdir`, `sync`, `deploy`) devolviendo código de salida 0 e informe estructurado.

* **FR-02 (State-Driven):**
  MIENTRAS el operador ejecute `npm run eos -- dual-track "<prompt>"`, EL SISTEMA DEBE evaluar la complejidad léxica, palabras clave de mutación de esquemas/seguridad y clasificar el requerimiento en `FAST_TRACK` o `HEAVY_TRACK`, generando la plantilla de especificación formal EARS y BDD correspondiente.

* **FR-03 (State-Driven):**
  MIENTRAS un usuario interactúe con el portal público en [eos-system-ten.vercel.app](https://eos-system-ten.vercel.app/), EL SISTEMA DEBE proveer en la consola interactiva comandos dedicados para `dualtrack:orchestrator` y `attestation:chain`, y reflejar el estado de Aberamentho 10/10 (47 leyendas, grabación Hi-Fi, CarPlay y Sacred Cymatics).

* **FR-04 (Ubiquitous / Permanent):**
  EL SISTEMA `scripts/sync-landing-page.mjs` DEBE mantener en sincronía perpetua tanto el portafolio personal como el portal web de EOS (`C:\Users\valen\Eos-System`), ejecutando la suite de auditoría estricta de ambos antes de cualquier despliegue.

---

### 2. CRITERIOS DE ACEPTACIÓN BDD (GIVEN-WHEN-THEN)

```gherkin
ESCENARIO: Ejecución Unificada de CLI de EOS
  DADO que el operador se encuentra en el plano de control Eos-System-1
  CUANDO ejecuta npm run eos -- status
  ENTONCES el sistema audita la flota, el centinela 24/7 y la ontología FDIR
  Y retorna Exit Code 0 sin requerir dependencias externas de NPM.

ESCENARIO: Sincronización y Despliegue en Vivo de eos-system-ten.vercel.app
  DADO que se actualizan los metadatos y comandos de la consola en C:\Users\valen\Eos-System
  CUANDO se ejecuta node scripts/verify-landing.mjs y npx vercel --prod --yes
  ENTONCES los 6/6 invariantes estrictos se verifican
  Y https://eos-system-ten.vercel.app/ responde HTTP 200 con la versión sincronizada.
```

# SPEC-005: EOS & LANDING PAGE CONTINUOUS SYNCHRONIZATION SPECIFICATION
## Formal Requirements (IEEE 830 / ISO 29148 Standard)

---

### 1. REQUISITOS FUNCIONALES (PATRONES EARS)

* **FR-01 (Event-Driven):**
  CUANDO el plano de control EOS registre una nueva versión, evidencia o capacidad en `docs/projects/registry.json`, EL SISTEMA `sync-landing-page.mjs` DEBE propagar las métricas de flota, commits activos y descripciones de capacidades a `C:\Users\valen\portafolio\src\data\portfolio.ts`.

* **FR-02 (State-Driven):**
  MIENTRAS el usuario o un agente consulte la landing page pública en [portafolio-valentin.vercel.app](https://portafolio-valentin.vercel.app/), EL SISTEMA DEBE exhibir las capacidades vigentes de Aberamentho DJ GOD 10/10 PRO (47 Leyendas, Grabador de Sets Hi-Fi, Controles Vehiculares MediaSession, Pioneer Jog Nudge y Cimática Sagrada) y de EOS Core 2.1 (Dual-Track, Sentinel Daemon, FDIR Self-Healing y 0 dependencias).

* **FR-03 (Error / Unwanted Condition):**
  SI se detecta una divergencia de metadatos o una ruta inválida durante la sincronización entre el registro de EOS y la landing page, ENTONCES EL SISTEMA DEBE emitir una advertencia diagnóstica detallada sin corromper el árbol de código fuente.

* **FR-04 (Ubiquitous / Permanent):**
  EL SISTEMA preservará en todo momento la compatibilidad estricta de tipos de TypeScript y la integridad estructural de la interfaz de usuario en la landing page.

---

### 2. CRITERIOS DE ACEPTACIÓN BDD (GIVEN-WHEN-THEN)

```gherkin
ESCENARIO: Sincronización Automática de Capacidades de la Flota hacia la Landing Page
  DADO que docs/projects/registry.json contiene el estado verificable de los sistemas soberanos
  CUANDO se ejecuta node scripts/sync-landing-page.mjs
  ENTONCES C:\Users\valen\portafolio\src\data\portfolio.ts se actualiza con los últimos commits y descripciones
  Y la suite de validación de tipos de la landing page finaliza con 0 errores.

ESCENARIO: Consistencia de Aberamentho DJ GOD en el Portafolio Público
  DADO el despliegue verificado de Aberamentho en https://aberamentosprelomamusic.vercel.app/
  CUANDO se audita la sección de proyectos en la landing page
  ENTONCES la tarjeta de Aberamentho refleja 47 artistas, grabación en vivo, MediaSession y Cymatics
  Y el enlace en vivo apunta a la URL activa de producción.
```

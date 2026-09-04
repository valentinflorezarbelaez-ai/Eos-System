# [SPEC-FUERZA-001]: React 19 Strict Hook Hygiene & State Hydration Optimization

* **Domain / Project:** `PRJ-APP-FUERZA`
* **Status:** `APPROVED`
* **Traceability Links:** `ITK-FUERZA-001` ➔ `AUDIT_REPORT.md` ➔ `SPEC-FUERZA-001` ➔ `PLAN-FUERZA-001` ➔ `TASKS-FUERZA-001`

---

## 1. Context & Problem Statement
Under React 19 and Next.js 16 (Turbopack), invoking `setState` synchronously within the body of a `useEffect` hook without an external subscription or event trigger produces cascading renders. In `src/app/page.tsx`, 4 separate effects trigger synchronous state mutations during initialization, and `Date.now()` is called impurely during render.

This specification defines the strict hygiene refactor required to bring `atp-strength-frontend` to **0 ESLint errors** and **100% React 19 compiler compliance**.

---

## 2. Functional Requirements (EARS Syntax)

* **FR-01 (Ubiquitous / Permanent — Pure Render & Idempotence)**:
  EL SISTEMA eliminará cualquier invocación directa de funciones impuras (`Date.now()`) dentro de renders o callbacks sincrónicos de estado, generando marcas temporales exclusivamente dentro de manejadores de eventos o efectos controlados.

* **FR-02 (State-Driven — Lazy State Initialization)**:
  MIENTRAS el componente `ZenDashboard` inicialice su estado desde `localStorage`, EL SISTEMA utilizará inicializadores perezosos de función (`useState(() => loadFromStorage())`) en lugar de despachar `setState` sincrónicos dentro de `useEffect`, eliminando los renders en cascada en el arranque.

* **FR-03 (Event-Driven — Asynchronous External Fetching Hygiene)**:
  CUANDO se monten los efectos de consulta de telemetría remota (`fetchMaxes` y `fetchHistory`), EL SISTEMA encapsulará las operaciones asíncronas con controladores de cancelación o banderas de montaje (`isMounted = true`), evitando llamadas directas a `setState` que violen las reglas de pureza de React 19.

* **FR-04 (Ubiquitous / Permanent — Zero Unused Tokens)**:
  EL SISTEMA purgará o integrará formalmente la constante `NEUROMUSCULAR_PHASES` para garantizar cero advertencias `@typescript-eslint/no-unused-vars`.

* **FR-05 (First-Principles Architectural Decomposition)**:
  EL SISTEMA descompondrá el monolito de `src/app/page.tsx` en un contenedor maestro orquestador (< 25 líneas) delegando responsabilidades en componentes de presentación desacoplados (`TimerDisplay`, `WorkoutLogger`, `RampingIndicator`, `TelemetrySyncBadge`), estrategias de entrenamiento puras (`workoutStrategies.ts`) y hooks de dominio dedicados (`useZenDashboard`, `useAtpTimer`, `useBackendWal`, `createWorkoutHandlers`), reduciendo el índice de sobreingeniería por debajo de 2.0.

---

## 3. Non-Functional & Quality Requirements (NFR)

* **NFR-01 (ESLint Strict Zero-Error Invariant)**:
  La ejecución de `npm run lint` en `atp-strength-frontend` finalizará con código de salida `0` y exactamente 0 errores y 0 advertencias.
* **NFR-02 (Zero Performance Regression)**:
  El tiempo de compilación con Turbopack (`npm run build`) se mantendrá por debajo de 10 segundos, preservando la generación estática (SSG) de todas las rutas.
* **NFR-03 (Offline Storage Invariant)**:
  La persistencia local de 1RM, series completadas y sesión activa en `localStorage` mantendrá el 100% de compatibilidad regresiva con los datos de usuarios existentes.
* **NFR-04 (First-Principles Bloat Index Invariant)**:
  El análisis estático con `FirstPrinciplesSimplifierEngine` certificará que ningún archivo de la aplicación exceda un `bloatIndex` de 4.5, manteniendo la media del proyecto por debajo de 2.0.

---

## 4. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)

```gherkin
ESCENARIO 01: Verificación estricta de linting en Next.js 16 / React 19
  DADO el repositorio frontend 'atp-strength-frontend'
  CUANDO se ejecuta 'npm run lint'
  ENTONCES el linter finaliza con código de salida 0
  Y la consola no reporta ninguna violación de 'react-hooks/set-state-in-effect'
  Y la consola no reporta ninguna violación de 'react-hooks/purity'

ESCENARIO 02: Hidratación local limpia sin render en cascada
  DADO un usuario con datos de sesión e historial guardados en localStorage
  CUANDO carga el dashboard principal en el navegador
  ENTONCES el estado de 1RM y series se hidrata en el primer ciclo de render
  Y el temporizador de ATP y el CTA adaptativo responden de inmediato sin titileos

ESCENARIO 03: Descomposición de punto caliente y verificación de simplicidad
  DADO el contenedor principal 'src/app/page.tsx'
  CUANDO se ejecuta la auditoría con 'FirstPrinciplesSimplifierEngine'
  ENTONCES 'page.tsx' contiene únicamente el orquestador desacoplado
  Y el 'bloatIndex' del archivo es inferior a 1.0
  Y el veredicto del proyecto es 'PASS'
```

---

## 5. Verification Plan
* Ejecutar `npm run lint` en `C:\Users\valen\Documents\APP fuerza\atp-strength-frontend` y verificar salida limpia.
* Ejecutar `npm run build` y verificar compilación exitosa en Turbopack.
* Ejecutar `eos simplify --project PRJ-APP-FUERZA --strict` y verificar veredicto PASS con 0 archivos sobre-diseñados.
* Sellar evidencia forense en `docs/evidence/EVD-0060.json`.

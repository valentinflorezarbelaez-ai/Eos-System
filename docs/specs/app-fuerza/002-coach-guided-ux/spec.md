# [SPEC-FUERZA-002]: Coach-Guided Flow, Warm Ergonomics & Progressive Disclosure

* **Domain / Project:** `PRJ-APP-FUERZA`
* **Status:** `APPROVED`
* **Traceability Links:** `ITK-FUERZA-002` ➔ `SPEC-FUERZA-002` ➔ `PLAN-FUERZA-002` ➔ `TASKS-FUERZA-002`

---

## 1. Context & Architectural Intent
`atp-strength-frontend` provides advanced bioenergetic auto-regulation and 1RM progression for heavy strength training. However, the existing interface exposes high cognitive density during active lifting sets.

This specification formalizes the **Coach-Guided Mode** (`CoachGuidedView`), introducing progressive disclosure so that lifters are guided step-by-step with warm, human feedback while preserving all underlying bioenergetic models, offline resilience, and OLED efficiency.

---

## 2. Functional Requirements (EARS Syntax)

* **FR-01 (Ubiquitous / Permanent — Dual View Architecture)**:
  EL SISTEMA mantendrá una arquitectura desacoplada conmutador entre `Modo Coach Guiado` (por defecto, enfocado en el paso actual) y `Modo Tablero Pro` (vista densa analítica), persistiendo la preferencia del usuario en almacenamiento local.

* **FR-02 (State-Driven — Linear Step Guidance)**:
  MIENTRAS el usuario se encuentre en `Modo Coach Guiado`, EL SISTEMA mostrará de forma prominente únicamente el paso activo de la sesión:
  1. `COACH_INTRO`: Saludo cálido, resumen del día y objetivos de carga.
  2. `WARMUP_RAMP`: Serie de aproximación activa con carga prescrita, repeticiones y explicación pedagógica del objetivo neuromuscular.
  3. `WORKING_SET`: Serie efectiva activa con objetivo de carga y RPE sugerido, con botón de acción primario táctil de gran dimensión.
  4. `ZEN_REST_TIMER`: Temporizador zen de resíntesis con cuenta regresiva, animación de respiración y aviso acústico sintetizado (528 Hz).
  5. `SESSION_VICTORY`: Resumen de volumen total, tonelaje levantado y felicitación cálida al completar todos los ejercicios del día.

* **FR-03 (Event-Driven — Single-Tap Step Progression)**:
  CUANDO el usuario presione el botón primario de acción ("¡Completé la serie!", "Listo, a descansar" o "Siguiente paso"), EL SISTEMA registrará la serie completada en memoria y WAL, disparará el temporizador de descanso óptimo según el tipo de ejercicio, y avanzará automáticamente al siguiente estado del flujo.

* **FR-04 (Ubiquitous / Permanent — Warm Ergonomic Micro-Copy)**:
  EL SISTEMA reemplazará la terminología clínica críptica en la interfaz primaria por micro-textos pedagógicos y motivadores:
  - En lugar de "F4 PAP 85%", mostrará "Aproximación pesada (despierta tu sistema nervioso)".
  - En lugar de "MOTOR DE RESÍNTESIS ATP-PCr", mostrará "Recuperá tu energía para la siguiente serie".
  - En lugar de "WAL OFFLINE QUEUE", mostrará un indicador amigable "Guardado en tu dispositivo".

* **FR-05 (Event-Driven — Quick Weight / Rep Adjustment in Flow)**:
  CUANDO el usuario requiera ajustar el peso o repeticiones realizadas en el paso activo, EL SISTEMA proporcionará controles táctiles directos (+ / -) de gran tamaño utilizables con manos sudorosas sin necesidad de abrir modales de calibración complejos.

---

## 3. Non-Functional & Quality Requirements (NFR)

* **NFR-01 (Zero ESLint & TypeCheck Regressions)**:
  `npm run lint` y `npm run build` en `atp-strength-frontend` se mantendrán con código de salida `0` y cero advertencias.
* **NFR-02 (OLED True Black Energy Invariant)**:
  El fondo principal preservará `#000000` absoluto para maximizar el ahorro de batería en pantallas OLED durante entrenamientos prolongados.
* **NFR-03 (Zero External Latency / Assets)**:
  El flujo guiado no incorporará librerías pesadas externas ni archivos de audio MP3 externos, reutilizando el motor `zenAudio.ts` existente (Web Audio API).
* **NFR-04 (Touch Target Accessibility)**:
  Todos los botones de acción del modo guiado tendrán una altura mínima de 56px (h-14) y radio redondeado (rounded-2xl) para garantizar ergonomía táctil en el gimnasio.

---

## 4. Acceptance Criteria (BDD / GIVEN-WHEN-THEN)

```gherkin
ESCENARIO 01: Inicio de entrenamiento en Modo Coach Guiado
  DADO que el usuario ingresa a la aplicación
  CUANDO carga el dashboard principal
  ENTONCES visualiza la tarjeta del Coach con saludo motivador y el primer ejercicio programado
  Y la interfaz no muestra tablas complejas ni modales invasivos
  Y se presenta un botón primario destacado para iniciar el calentamiento

ESCENARIO 02: Ejecución y avance de serie efectiva
  DADO que el usuario está en el paso de serie efectiva con 100 kg programados
  CUANDO presiona el botón "¡Serie completada!"
  ENTONCES la serie se marca como realizada en el mapa de progreso
  Y el temporizador de resíntesis se inicia automáticamente con el tiempo prescrito
  Y la pantalla cambia al estado de descanso relajante con el tiempo restante visible

ESCENARIO 03: Finalización del entrenamiento del día
  DADO que el usuario completa la última serie del último ejercicio del día
  CUANDO se registra dicha serie
  ENTONCES la interfaz transiciona a la pantalla de victoria
  Y muestra el volumen total movido y un mensaje de felicitación cálido
  Y ofrece un botón para revisar el historial completo o cerrar la sesión
```

---

## 5. Verification Plan
1. Ejecutar `npm run lint` en `atp-strength-frontend` (verificar 0 errores).
2. Ejecutar `npm run build` en `atp-strength-frontend` (verificar compilación exitosa).
3. Ejecutar pipeline EOS en modo verify (`node bin/eos-orchestrator.js run --project PRJ-APP-FUERZA --phase verify`).

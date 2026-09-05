# Engineering Intake: [ITK-FUERZA-002] Coach-Guided Workout Flow & Ergonomic Warmth

* **Project ID:** `PRJ-APP-FUERZA`
* **Target Path:** `C:\Users\valen\Documents\APP fuerza`
* **Intake Date:** 2026-09-05
* **Author / Architect:** Senior Architect / EOS Control Plane
* **Status:** `COMPLETE`

---

## 1. User Need & Cognitive Friction
During active gym workouts, strength lifters experience high central nervous system (CNS) and metabolic fatigue. The current dashboard presents high cognitive density:
- Heavy neuro-bioenergetic jargon ("NEURO//STRENGTH PRO-V1", "F4 PAP", "MOTOR ZEN DE RESÍNTESIS DE ATP", raw WAL queue telemetry).
- Information overload: 8+ visible action buttons, complex formulas, calibrations, and tables on the initial screen.
- Lack of a linear, guided, conversational coach experience that answers the single question: **"What do I do right now, with what weight, and for how many reps?"**

## 2. Strategic Objectives
1. **Coach-Guided Flow (Progressive Disclosure):** Provide a focused, linear mode where only the current step is prominent:
   - `SELECT_DAY` ➔ `COACH_INTRO` ➔ `WARMUP_RAMP_STEP` ➔ `WORKING_SET` ➔ `ZEN_REST_TIMER` ➔ `SESSION_VICTORY`.
2. **Warmth & Human-Centered Micro-Copy:** Transform cold clinical text into empathetic, clear gym cues (e.g., "Aproximación pesada para despertar el sistema nervioso", "¡Excelente serie! Ahora 3 minutos de descanso profundo").
3. **Ergonomic Gym Usability:** Oversized buttons for sweaty gym hands, high contrast OLED True Black, smooth micro-transitions, and quick toggle between "Modo Coach Guiado" and "Modo Tablero Pro".
4. **Zero Regression:** Preserve 100% of underlying domain logic (`computeMetrics`, `atpTimerEngine`, `walSync`, `zenAudio`, local persistence).

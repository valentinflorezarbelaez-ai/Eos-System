# SPEC-0005: Neuro-Acoustic Biofeedback & Speech Coaching Engine

* **Component ID:** `FUE-ACOUSTIC-BIOFEEDBACK-2026`
* **Status:** `APPROVED_FOR_TDD_IMPLEMENTATION`
* **Target Project:** `PRJ-APP-FUERZA`
* **Path:** `.eos/satellites/app-fuerza/atp-strength-frontend/src/lib/acousticFeedback.ts`
* **Version:** `1.0.0`
* **Traceability Index:** `REQ-FUE-005` ➔ `EVD-FUE-ACOUSTIC-XXXX`
* **Policy:** `L0_NODE_BUILTINS_ONLY` (Pure Domain & Browser Speech Synthesis API)

---

## 1. Requirements Engineering (EARS Syntax)

- **[REQ-EARS-AUDIO-01] (Event-Driven - Set Completion Biofeedback)**:  
  **WHEN** an athlete logs a completed working or warmup set in Coach Mode,  
  **THE SYSTEM SHALL** trigger the instant harmonic chime (Web Audio API at 528/880 Hz) AND queue a randomized motivational verbal coaching cue in Spanish via native `SpeechSynthesis`.

- **[REQ-EARS-AUDIO-02] (Event-Driven - Dynamic Metric Narration)**:  
  **WHEN** telemetry narration is enabled and a top working set is logged with load ($kg > 0$) and RPE ($6.5 \le RPE \le 10.0$),  
  **THE SYSTEM SHALL** construct and synthesize an articulated performance cue (e.g., *"Serie de 100 kilos completada a RPE 8. A recuperar"*).

- **[REQ-EARS-AUDIO-03] (State-Driven - Rest Period Auditory Milestones)**:  
  **WHILE** the ATP Zen rest timer is counting down,  
  **THE SYSTEM SHALL** deliver speech/tone countdown cues at critical neuromuscular milestones:
  * At 50% rest elapsed: *"Mitad del descanso. Foco en la respiración."*
  * At 10 seconds remaining: Warning chime (880 Hz double pulse) + *"10 segundos. Preparate para la barra."*

- **[REQ-EARS-AUDIO-04] (State-Driven - Session Victory Auditory Fanfare)**:  
  **WHEN** the final set of the final exercise is logged,  
  **THE SYSTEM SHALL** trigger the victory fanfare arpeggio AND speak a final congratulatory session closing cue.

- **[REQ-EARS-AUDIO-05] (Error / Unwanted Condition - Autoplay Policy & Offline Silence Protection)**:  
  **IF** the user's browser blocks speech synthesis or audio context due to un-interacted autoplay restrictions or permission absence,  
  **THEN THE SYSTEM SHALL** catch the rejection silently without crashing the UI, log a non-blocking diagnostic, and fallback to tactile haptic pulse (`navigator.vibrate`).

- **[REQ-EARS-AUDIO-06] (Ubiquitous - User Preference Persistence)**:  
  **THE SYSTEM SHALL** persist coach audio preferences (`voiceEnabled: boolean`, `soundEnabled: boolean`, `voiceVolume: number`) in `localStorage` under `atp_coach_audio_prefs`.

---

## 2. Acceptance Scenarios (Gherkin / BDD)

### Scenario 1: Set Completion Cue Generation & Chime Trigger
```gherkin
Scenario: Delivering immediate auditory feedback upon set completion
  Given an athlete is in Coach Mode with Voice Coaching enabled
  When the athlete clicks "Completar Serie" for Set 2 of Bench Press
  Then the Web Audio chime must execute with zero observable delay
  And the SpeechSynthesis queue must receive a randomized cue from the SET_COMPLETED bank
  And haptic vibration of 150ms must be triggered
```

### Scenario 2: Rest Countdown Warning at 10 Seconds
```gherkin
Scenario: Announcing rest timer countdown warning
  Given an active rest countdown of 180 seconds
  When the countdown clock reaches exactly 10 seconds remaining
  Then a distinct warning chime (880 Hz) must be synthesized
  And the voice coach must speak "10 segundos. Preparate para la barra."
```

### Scenario 3: Graceful Fallback when Audio is Blocked
```gherkin
Scenario: Handling browser autoplay restrictions or audio errors
  Given a browser environment where window.speechSynthesis throws an exception
  When a set is completed
  Then the exception must be caught gracefully
  And the application state must transition without interruption
  And the tactile haptic fallback must execute
```

---

## 3. Data Contracts & Pure Interface

```typescript
export type CoachingEventType =
  | 'SET_COMPLETED'
  | 'EXERCISE_COMPLETED'
  | 'REST_HALFWAY'
  | 'REST_10S_WARNING'
  | 'SESSION_VICTORY';

export interface CoachAudioPreferences {
  soundEnabled: boolean; // Chimes / Web Audio
  voiceEnabled: boolean; // Spoken coaching cues
  voiceVolume: number;   // 0.0 to 1.0
  voiceRate: number;     // 0.8 to 1.3 (default 1.05 for energetic delivery)
}

export interface TelemetryNarrationParams {
  exerciseName?: string;
  weightKg?: number;
  reps?: number;
  rpe?: number;
}

export interface AcousticFeedbackPort {
  playSetCompleteCue(params?: TelemetryNarrationParams): void;
  playRestHalfwayCue(): void;
  playRestWarningCue(): void;
  playExerciseCompleteCue(nextExerciseName?: string): void;
  playSessionVictoryCue(): void;
  updatePreferences(prefs: Partial<CoachAudioPreferences>): void;
  getPreferences(): CoachAudioPreferences;
}
```

---

## 4. Motivational Voice Cue Banks (Spanish Localized)

```typescript
export const COACH_CUES: Record<CoachingEventType, string[]> = {
  SET_COMPLETED: [
    '¡Buena serie! A recuperar.',
    '¡Excelente esfuerzo, guerrero!',
    '¡Eso es fuerza pura!',
    '¡Gran serie! Respira profundo.',
    '¡Impecable ejecución! Buen trabajo.',
  ],
  EXERCISE_COMPLETED: [
    '¡Ejercicio liquidado! Gran trabajo, pasamos al siguiente.',
    '¡Excelente ritmo! Un ejercicio menos, seguimos firmes.',
    '¡Liquidado! Prepárate para el próximo movimiento.',
  ],
  REST_HALFWAY: [
    'Mitad del descanso. Foco en la respiración y recuperación.',
  ],
  REST_10S_WARNING: [
    'Diez segundos. Preparate para la barra.',
  ],
  SESSION_VICTORY: [
    '¡Sesión completada con éxito! Gran entrenamiento hoy, a descansar.',
  ],
};
```

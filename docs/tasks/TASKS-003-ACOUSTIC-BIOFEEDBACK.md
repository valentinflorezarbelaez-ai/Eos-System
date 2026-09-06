# Atomic Task DAG: [TASKS-FUERZA-003] Neuro-Acoustic Biofeedback Implementation

* **Feature:** Neuro-Acoustic Biofeedback & Speech Coaching Engine
* **Target Project:** `PRJ-APP-FUERZA`
* **Status:** `READY_FOR_EXECUTION`
* **Traceability:** `SPEC-0005` ➔ `PLAN-FUERZA-003` ➔ `TASKS-FUERZA-003`

---

## Dependency Graph (DAG)

```text
[TASK-01: Pure Audio Engine & Cue Banks] ──► [TASK-02: Domain Unit Tests (Node)] ──► [TASK-03: CoachGuidedView Integration] ──► [TASK-04: TypeScript & Lint Audit] ──► [TASK-05: Browser QA & Sealed Evidence]
```

---

## Tasks

### TASK-01: Implement `src/lib/acousticFeedback.ts`
* **Target:** `.eos/satellites/app-fuerza/atp-strength-frontend/src/lib/acousticFeedback.ts`
* **Action:**
  - Define `CoachAudioPreferences` and `COACH_CUES` data dictionaries.
  - Implement `speakCue(type, params)` using native `window.speechSynthesis`.
  - Implement safe preference loading and saving in `localStorage`.
  - Fallback gracefully to `hapticPulse` if speech synthesis is unavailable or blocked by autoplay.
* **Done Criteria:**
  - 100% TypeScript type safety.
  - Zero external bundle dependencies.

### TASK-02: Domain Unit Tests in Node.js
* **Target:** `.eos/satellites/app-fuerza/atp-strength-frontend/tests/acousticFeedback.test.mjs`
* **Action:**
  - Unit test cue selection randomness, formatting with dynamic telemetry, and graceful error handling when `speechSynthesis` fails.
* **Done Criteria:**
  - Tests run via `node` and exit with code 0.

### TASK-03: Integration in `CoachGuidedView.tsx` & `useAtpTimer.ts`
* **Target:** `.eos/satellites/app-fuerza/atp-strength-frontend/src/app/components/CoachGuidedView.tsx`
* **Action:**
  - Add voice coach toggle pill (`Voz Coach: ON/OFF`) next to Modo Coach.
  - Trigger `playSetCompleteCue()` on set completion.
  - Trigger rest warnings (10s warning) and session victory cues.
* **Done Criteria:**
  - Accessible button toggle with clear visual indicator.
  - No UI freezes or race conditions.

### TASK-04: Quality & Compiler Verification
* **Action:** Run `npm run build` and `npm run lint` in `atp-strength-frontend`.
* **Done Criteria:**
  - TypeScript compilation exits code 0 with 0 errors.
  - Linter exits clean with 0 warnings.

### TASK-05: Browser QA & Evidence Collection
* **Action:** Run browser subagent in local/preview build to verify Coach Mode acoustic cues, DOM accessibility, and record evidence.
* **Done Criteria:**
  - Video recording and clean console logs captured.

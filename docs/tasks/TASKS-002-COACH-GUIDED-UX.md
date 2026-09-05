# Atomic Task DAG: [TASKS-FUERZA-002] Coach-Guided UX Implementation

* **Feature:** Coach-Guided Workout Flow & Ergonomic Warmth
* **Target Project:** `PRJ-APP-FUERZA`
* **Status:** `READY_FOR_EXECUTION`

---

## Dependency Graph (DAG)

```text
[TASK-01: Hook Extension] ──► [TASK-02: CoachGuidedView UI] ──► [TASK-03: Page Toggle Wire-up] ──► [TASK-04: Lint & Build Verification] ──► [TASK-05: Sealed Evidence]
```

---

## Tasks

### TASK-01: Hook Extension in `useZenDashboard.ts`
* **Target:** `C:\Users\valen\Documents\APP fuerza\atp-strength-frontend\src\app\hooks\useZenDashboard.ts`
* **Action:** Expose `coachMode` state (defaulting to `true` with `localStorage` persistence) and a toggle function `toggleCoachMode()`.
* **Done Criteria:**
  - `coachMode` boolean is accessible on the return object of `useZenDashboard`.
  - Preference persists across browser reloads.

### TASK-02: Implement `CoachGuidedView.tsx` Component
* **Target:** `C:\Users\valen\Documents\APP fuerza\atp-strength-frontend\src\app\components\CoachGuidedView.tsx`
* **Action:** Build the warm, high-contrast, linear coach presentation view:
  - Header: Clean, warm greeting, day selector, mode toggle (`Modo Coach` / `Modo Pro`), sync status.
  - Active Step Card: Prominent step title ("Calentamiento", "Serie Efectiva #N", "Descanso Zen"), target weight, reps, and warm motivational cue.
  - Controls: Big touch targets (h-14, rounded-2xl) for completing steps, quick weight/rep increment (+/- 2.5kg / +/- 1 rep).
  - Integrated Zen Rest: Clear countdown timer with breathing cue and 528 Hz chime alert.
  - Victory Screen: Clean celebration with total volume lifted.
* **Done Criteria:**
  - Zero TypeScript errors.
  - Accessible touch targets >= 56px.
  - Pure `#000000` background.

### TASK-03: Wire View in `page.tsx` or `ZenDashboardView.tsx`
* **Target:** `C:\Users\valen\Documents\APP fuerza\atp-strength-frontend\src\app\page.tsx`
* **Action:** Conditionally render `CoachGuidedView` when `d.coachMode` is `true`, and `ZenDashboardView` when `false`.
* **Done Criteria:**
  - Seamless toggle with instant response and zero flickering.

### TASK-04: Quality & Compiler Verification
* **Action:** Run `npm run lint` and `npm run build` in `atp-strength-frontend`.
* **Done Criteria:**
  - `npm run lint` exits code 0 with 0 errors.
  - `npm run build` generates all static routes successfully.

### TASK-05: Sealed Evidence
* **Action:** Run `node bin/eos-orchestrator.js run --project PRJ-APP-FUERZA --phase verify` and record execution.
* **Done Criteria:**
  - Cryptographic evidence generated with SHA-256 seal.

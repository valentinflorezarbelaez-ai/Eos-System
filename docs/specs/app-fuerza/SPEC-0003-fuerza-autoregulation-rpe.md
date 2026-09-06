# SPEC-0003: Fuerza Autoregulation Engine — Mike Tuchscherer RPE/RIR & Dynamic e1RM

* **Component ID:** `FUE-AUTO-RPE-2026`
* **Status:** `APPROVED_FOR_TDD_IMPLEMENTATION`
* **Target Project:** `PRJ-APP-FUERZA`
* **Path:** `.eos/satellites/app-fuerza/atp-strength-frontend`
* **Version:** `1.0.0`
* **Traceability Index:** `REQ-FUE-003` -> `EVD-FUE-AUTO-XXXX`
* **Policy:** `L0_NODE_BUILTINS_ONLY` (Pure Domain Logic)

---

## 1. Requirements Engineering (EARS Syntax)

- **[REQ-EARS-AUTO-01] (Ubiquitous - Deterministic %1RM Matrix Lookup)**:  
  **THE SYSTEM** SHALL map any valid combination of repetitions ($1 \le reps \le 10$) and Rate of Perceived Exertion ($6.5 \le RPE \le 10.0$ in 0.5 steps) to the authoritative Mike Tuchscherer %1RM intensity coefficient.

- **[REQ-EARS-AUTO-02] (Event-Driven - Dynamic e1RM Calculation)**:  
  **WHEN** a completed set is logged with load ($kg > 0$), completed repetitions ($1 \le reps \le 10$), and perceived exertion ($6.5 \le RPE \le 10.0$),  
  **THE SYSTEM SHALL** calculate the estimated 1-Repetition Maximum ($e1RM$) using the exact formula:
  $$e1RM = \frac{\text{weight}}{\%1RM(reps, RPE)}$$
  rounded to the nearest 0.5 kg.

- **[REQ-EARS-AUTO-03] (State-Driven - Adaptive Next-Set Load Prescription)**:  
  **WHILE** an active session is in progress with remaining working sets,  
  **THE SYSTEM SHALL** compute the auto-regulated target load for the subsequent set by evaluating the current session's live $e1RM$ against target repetitions and target RPE, rounded to the bar implement step (default 2.5 kg).

- **[REQ-EARS-AUTO-04] (Error / Unwanted Condition - Input Validation & Bounds Protection)**:  
  **IF** input parameters contain reps $< 1$, reps $> 10$, RPE $< 6.5$, RPE $> 10.0$, or weight $\le 0$,  
  **THEN THE SYSTEM SHALL** throw an explicit domain error `ERR-FUE-INVALID-RPE-PARAMETERS` or gracefully clamp within bounds depending on the boundary contract.

---

## 2. Acceptance Scenarios (Gherkin / BDD)

### Business Rule 01: Exact e1RM Calculation via Tuchscherer Matrix

```gherkin
Scenario: Calculating e1RM from a top set at RPE 8
  Given a lifter logs a working set of 140 kg for 3 repetitions
  And the perceived exertion reported is RPE 8.0
  When the neuromuscular engine computes the estimated 1RM
  Then the corresponding %1RM coefficient must be exactly 0.863 (86.3%)
  And the resulting e1RM must be calculated as 162.2 kg (140 / 0.863)
```

### Business Rule 02: Autoregulated Load Adjustment for Overshoot / Undershoot

```gherkin
Scenario: Target load auto-adjustment after an unexpected RPE overshoot
  Given a lifter is prescribed 3 repetitions @ target RPE 8.0
  And the lifter performs 140 kg but experiences RPE 9.5 (overshoot of +1.5 RPE)
  When the autoregulation engine evaluates load for the next set at target RPE 8.0
  Then the engine calculates a degraded daily e1RM of 154.4 kg (140 / 0.907)
  And the prescribed load for the next set is auto-regulated down to 132.5 kg
  And the engine reports a negative delta adjustment of -7.5 kg
```

---

## 3. Data Contracts & Pure L0 Interface

```typescript
export type RpeScore = 6.5 | 7.0 | 7.5 | 8.0 | 8.5 | 9.0 | 9.5 | 10.0;
export type RepRange = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface AutoregulationResult {
  e1rm: number;
  intensityPercent: number;
  nextTargetWeight: number;
  deltaKg: number;
  rpeOvershoot: number;
  fatigueDetected: boolean;
}

export interface SetLogInput {
  weightKg: number;
  reps: RepRange;
  rpe: RpeScore;
  targetReps: RepRange;
  targetRpe: RpeScore;
  implementStepKg?: number; // default 2.5
}
```

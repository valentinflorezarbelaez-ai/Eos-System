# SPEC-019: Monte Carlo Risk Simulation Engine

## Milestone ID: `SPEC-019-MONTE-CARLO-RISK-ENGINE`
## Status: APPROVED
## Date: 2026-10-25

---

## 1. Functional Requirements (EARS Syntax)

### FR-019-01: Stochastic Sampling Execution (Event-Driven)
WHEN a simulation request is submitted with a list of tasks (each defining optimistic $O$, nominal $M$, and pessimistic $P$ estimates) and iteration count $N$,
THE SYSTEM SHALL run $N$ independent simulation passes, sampling task durations from the Beta-PERT probability distribution.

### FR-019-02: Statistical Percentile Calculation (Event-Driven)
WHEN the simulation finishes $N$ iterations,
THE SYSTEM SHALL sort total simulated durations and calculate exact percentiles: P10, P50 (median), P80 (commercial commitment), P90, P95, and P99 (catastrophic tail risk).

### FR-019-03: Deterministic Pseudo-Random Seeding (State-Driven)
WHILE a numeric seed is provided to the simulator,
THE SYSTEM SHALL generate a deterministic pseudo-random sequence (e.g. Mulberry32 or LCG), guaranteeing 100% reproducible numerical outputs across test runs.

### FR-019-04: Target Deadline Confidence Calculation (Event-Driven)
WHEN an optional target deadline $D$ is provided alongside tasks,
THE SYSTEM SHALL calculate the exact percentage of iterations that finished in $\le D$, representing the probability of on-time delivery.

### FR-019-05: Statistical Summary Metrics (Ubiquitous)
THE SYSTEM SHALL compute mean, standard deviation, variance, minimum duration, and maximum duration across all simulation iterations.

### FR-019-06: CLI Risk Simulation Command (Event-Driven)
WHEN the operator runs `eos estimate "<scope>" --monte-carlo` or `eos sim [iterations]`,
THE SYSTEM SHALL execute the Monte Carlo simulation and display a structured ASCII histogram or percentile breakdown table.

---

## 2. Acceptance Criteria (BDD Syntax)

```gherkin
ESCENARIO: Simulación estocástica reproducible con semilla fija
  DADO un conjunto de 3 tareas con estimaciones (O=5, M=10, P=20) y una semilla fija 12345
  CUANDO se ejecuta MonteCarloRiskSimulator.simulate() con 5,000 iteraciones
  ENTONCES la duración media y los percentiles P50 y P80 son idénticos en ejecuciones consecutivas
  Y P10 < P50 < P80 < P90 < P99

ESCENARIO: Probabilidad de cumplimiento de fecha límite
  DADO un proyecto cuya duración media calculada es de 40 horas
  CUANDO se consulta la probabilidad de entrega para una fecha límite de 45 horas
  ENTONCES la probabilidad retornada es mayor al 50% y menor o igual al 100%

ESCENARIO: Rendimiento de cómputo institucional
  DADO un grafo de 10 tareas complejas
  CUANDO se ejecutan 10,000 iteraciones de Monte Carlo
  ENTONCES la simulación completa en menos de 100 milisegundos
```

---

## 3. Non-Functional Requirements (NFR)

### NFR-019-01: Pure Domain Isolation
`src/core/domain/models/MonteCarloRiskSimulator.ts` must contain zero external dependencies and zero Node.js I/O imports (`fs`, `path`, `http`).

### NFR-019-02: Memory Footprint
The simulation must execute with bounded memory allocation, avoiding array allocations that exceed 50MB.

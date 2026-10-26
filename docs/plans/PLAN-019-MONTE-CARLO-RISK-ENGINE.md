# PLAN-019: Monte Carlo Risk Simulation Engine

## Milestone: `SPEC-019-MONTE-CARLO-RISK-ENGINE`
## Status: APPROVED
## Date: 2026-10-25

---

## 1. Architectural Strategy & Clean Hexagonal Design

```
[ CLI (eos sim / eos estimate --monte-carlo) ]
                     │
                     ▼
[ Application Layer: RiskSimulationService (src/core/application/RiskSimulationService.ts) ]
                     │
                     ▼ (pure domain entities)
[ Domain Layer: MonteCarloRiskSimulator (src/core/domain/models/MonteCarloRiskSimulator.ts) ]
```

---

## 2. Architectural Decision Records (ADRs)

### ADR-019-01: Beta-PERT Approximation Sampling
- **Context:** Classical Beta distribution sampling requires evaluating inverse incomplete beta functions ($I_x^{-1}(a, b)$), which can be computationally intensive without external math libraries.
- **Decision:** Implement a four-point random variate generation using a sum of uniform random variables shaped to approximate $\text{Beta}(\alpha, \beta)$ where $\mu = \frac{O + 4M + P}{6}$ and $\sigma = \frac{P - O}{6}$, combined with exact triangular fallback option.
- **Alternatives Rejected:**
  - *Importing heavy npm math libraries (like `jstat` or `simple-statistics`):* Rejected because it violates the Law of Hexagonal Purity (zero external dependencies in Layer 0).

### ADR-019-02: Mulberry32 Seeded PRNG
- **Context:** `Math.random()` in JavaScript is non-deterministic and cannot be seeded across different test runs.
- **Decision:** Implement an internal 32-bit PRNG (`Mulberry32`) that provides uniform pseudorandom float distribution $[0, 1)$ when a seed is provided, falling back to `Math.random()` when unseeded.
- **Rationale:** Guarantees 100% deterministic, reproducible assertions in Vitest while maintaining zero external imports.

---

## 3. Module Boundaries & Data Contracts

### 3.1 Domain Model: `src/core/domain/models/MonteCarloRiskSimulator.ts`
- Interfaces: `SimulationTask`, `SimulationResult`, `PercentileBreakdown`
- Class: `MonteCarloRiskSimulator`
  - `static simulate(params: SimulationParams): SimulationResult`
  - Calculates percentiles: P10, P50, P80, P90, P95, P99
  - Computes probability of meeting `deadlineHours`

### 3.2 Application Service: `src/core/application/RiskSimulationService.ts`
- Connects `ProductionRagEstimationService` with `MonteCarloRiskSimulator`.
- Emits telemetry events to `TelemetryPipeline`.

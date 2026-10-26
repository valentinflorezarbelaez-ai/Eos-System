/**
 * RiskSimulationService Application Service (Layer 1 — Application)
 * SPEC-019: Monte Carlo Risk Simulation Engine
 *
 * Coordinates institutional stochastic risk assessments, generates percentile breakdowns,
 * and emits structured telemetry.
 */

import {
  MonteCarloRiskSimulator,
  type SimulationTask,
  type SimulationResult,
  type SimulationOptions,
} from '../domain/models/MonteCarloRiskSimulator.js';
import type { TelemetryPipeline } from './TelemetryPipeline.js';

export interface RiskSimulationServiceOptions {
  readonly telemetry?: TelemetryPipeline | undefined;
}

export class RiskSimulationService {
  private readonly telemetry?: TelemetryPipeline | undefined;

  constructor(options: RiskSimulationServiceOptions = {}) {
    this.telemetry = options.telemetry;
  }

  runSimulation(tasks: readonly SimulationTask[], options: SimulationOptions = {}): SimulationResult {
    const start = Date.now();
    const result = MonteCarloRiskSimulator.simulate(tasks, options);
    const durationMs = Date.now() - start;

    this.telemetry?.emit(
      'INFO',
      'RiskSimulationService',
      `Monte Carlo risk simulation completed: ${result.summary.iterations} runs, mean ${result.summary.mean}h, P80 ${result.percentiles.p80}h (${durationMs}ms).`,
      {
        iterations: result.summary.iterations,
        meanHours: result.summary.mean,
        p80Hours: result.percentiles.p80,
        p99Hours: result.percentiles.p99,
        durationMs,
      }
    );

    return result;
  }

  formatReport(result: SimulationResult): string {
    const s = result.summary;
    const p = result.percentiles;

    return `
================================================================
    MONTE CARLO STOCHASTIC RISK REPORT (ALADDIN ENGINE)
================================================================
Iterations Executed : ${s.iterations.toLocaleString()} passes
Mean Expected Time  : ${s.mean} hours (σ = ${s.standardDeviation}h)
Range Bounds        : [${s.min}h min ... ${s.max}h max]
${s.deadlineProbability !== undefined ? `Target SLA Prob.    : ${s.deadlineProbability}% on-time probability\n` : ''}
CONFIDENCE PERCENTILE CURVE:
  P10 (Aggressive)  : ${p.p10} hours (10% confidence ceiling)
  P50 (Median)      : ${p.p50} hours (Nominal expectation)
  P80 (Commitment)  : ${p.p80} hours (Commercial SLA threshold)
  P90 (Conservative): ${p.p90} hours (High-assurance defense bound)
  P95 (Critical)    : ${p.p95} hours (Severe delay boundary)
  P99 (Catastrophic): ${p.p99} hours (Worst-case tail risk)
================================================================
`;
  }
}

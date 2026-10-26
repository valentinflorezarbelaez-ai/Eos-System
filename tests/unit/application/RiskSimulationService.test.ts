/**
 * Unit Tests for RiskSimulationService Application Service
 * SPEC-019: Monte Carlo Risk Simulation Engine
 */

import { describe, it, expect, vi } from 'vitest';
import { RiskSimulationService } from '../../../src/core/application/RiskSimulationService.js';
import type { TelemetryPipeline } from '../../../src/core/application/TelemetryPipeline.js';
import type { SimulationTask } from '../../../src/core/domain/models/MonteCarloRiskSimulator.js';

describe('RiskSimulationService Application Service', () => {
  const dummyTasks: SimulationTask[] = [
    { id: 'T1', name: 'Task 1', optimistic: 5, nominal: 10, pessimistic: 15 },
    { id: 'T2', name: 'Task 2', optimistic: 2, nominal: 4, pessimistic: 6 },
  ];

  it('runs simulation, produces formatted report, and emits telemetry', () => {
    const mockTelemetry: TelemetryPipeline = {
      emit: vi.fn(),
    } as unknown as TelemetryPipeline;

    const service = new RiskSimulationService({ telemetry: mockTelemetry });
    const result = service.runSimulation(dummyTasks, { iterations: 1000, seed: 123 });

    expect(result.summary.iterations).toBe(1000);
    expect(mockTelemetry.emit).toHaveBeenCalledWith(
      'INFO',
      'RiskSimulationService',
      expect.stringContaining('Monte Carlo risk simulation completed'),
      expect.any(Object)
    );

    const report = service.formatReport(result);
    expect(report).toContain('MONTE CARLO STOCHASTIC RISK REPORT');
    expect(report).toContain('P80 (Commitment)');
    expect(report).toContain('P99 (Catastrophic)');
  });
});

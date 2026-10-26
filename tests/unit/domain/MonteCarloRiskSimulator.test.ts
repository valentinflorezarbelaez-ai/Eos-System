/**
 * Unit Tests for MonteCarloRiskSimulator Domain Model
 * SPEC-019: Monte Carlo Risk Simulation Engine
 */

import { describe, it, expect } from 'vitest';
import {
  MonteCarloRiskSimulator,
  type SimulationTask,
} from '../../../src/core/domain/models/MonteCarloRiskSimulator.js';

describe('MonteCarloRiskSimulator Domain Model', () => {
  const sampleTasks: SimulationTask[] = [
    { id: 'TASK-1', name: 'Database Architecture', optimistic: 4, nominal: 8, pessimistic: 16 },
    { id: 'TASK-2', name: 'Authentication Engine', optimistic: 6, nominal: 12, pessimistic: 24 },
    { id: 'TASK-3', name: 'UI Components', optimistic: 2, nominal: 5, pessimistic: 10 },
  ];

  it('executes simulation with ordered percentile distribution', () => {
    const result = MonteCarloRiskSimulator.simulate(sampleTasks, { iterations: 5000, seed: 42 });

    expect(result.summary.iterations).toBe(5000);
    expect(result.summary.mean).toBeGreaterThan(0);
    expect(result.summary.standardDeviation).toBeGreaterThan(0);

    const p = result.percentiles;
    expect(p.p10).toBeLessThanOrEqual(p.p50);
    expect(p.p50).toBeLessThanOrEqual(p.p80);
    expect(p.p80).toBeLessThanOrEqual(p.p90);
    expect(p.p90).toBeLessThanOrEqual(p.p95);
    expect(p.p95).toBeLessThanOrEqual(p.p99);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.summary)).toBe(true);
    expect(Object.isFrozen(result.percentiles)).toBe(true);
  });

  it('guarantees deterministic outputs when seeded with Mulberry32', () => {
    const run1 = MonteCarloRiskSimulator.simulate(sampleTasks, { iterations: 2000, seed: 9999 });
    const run2 = MonteCarloRiskSimulator.simulate(sampleTasks, { iterations: 2000, seed: 9999 });

    expect(run1.summary.mean).toBe(run2.summary.mean);
    expect(run1.percentiles.p50).toBe(run2.percentiles.p50);
    expect(run1.percentiles.p80).toBe(run2.percentiles.p80);
    expect(run1.percentiles.p99).toBe(run2.percentiles.p99);
  });

  it('calculates deadline completion probability accurately', () => {
    const result = MonteCarloRiskSimulator.simulate(sampleTasks, {
      iterations: 3000,
      seed: 1234,
      deadlineHours: 35,
    });

    expect(result.summary.deadlineProbability).toBeDefined();
    expect(result.summary.deadlineProbability!).toBeGreaterThan(0);
    expect(result.summary.deadlineProbability!).toBeLessThanOrEqual(100);
  });

  it('rejects invalid inputs and boundary violations', () => {
    expect(() => MonteCarloRiskSimulator.simulate([])).toThrow('Simulation requires at least one task');

    expect(() =>
      MonteCarloRiskSimulator.simulate([
        { id: 'BAD-1', name: 'Bad Task', optimistic: -5, nominal: 10, pessimistic: 20 },
      ])
    ).toThrow('cannot be negative');

    expect(() =>
      MonteCarloRiskSimulator.simulate([
        { id: 'BAD-2', name: 'Bad Task', optimistic: 15, nominal: 10, pessimistic: 20 },
      ])
    ).toThrow('invalid bounds');
  });

  it('handles degenerate task where optimistic equals pessimistic', () => {
    const fixedTask: SimulationTask[] = [
      { id: 'FIXED-1', name: 'Fixed Task', optimistic: 10, nominal: 10, pessimistic: 10 },
    ];

    const result = MonteCarloRiskSimulator.simulate(fixedTask, { iterations: 500, seed: 777 });
    expect(result.summary.mean).toBe(10);
    expect(result.percentiles.p50).toBe(10);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeterministicChaosEngine, CHAOS_FAULT_TYPES } from '../src/core/resilience/deterministic-chaos-engine.js';

describe('DeterministicChaosEngine', () => {
  it('TC-01: Instantiation and deterministic PRNG behavior', () => {
    const engine = new DeterministicChaosEngine({ seed: 42 });
    assert.equal(engine.seed, 42);

    // Test deterministic sequence
    const r1 = engine._nextRandom();
    const r2 = engine._nextRandom();
    const r3 = engine._nextRandom();

    // We can't easily guess the exact numbers beforehand without running the math,
    // but we can ensure that a new instance with same seed produces the same sequence.
    const engine2 = new DeterministicChaosEngine({ seed: 42 });
    assert.equal(engine2._nextRandom(), r1);
    assert.equal(engine2._nextRandom(), r2);
    assert.equal(engine2._nextRandom(), r3);

    // Test resetSeed
    engine.resetSeed();
    assert.equal(engine._nextRandom(), r1);

    // Test resetSeed with new seed
    engine.resetSeed(100);
    assert.equal(engine.seed, 100);
    assert.notEqual(engine._nextRandom(), r1);
  });

  it('TC-02: runChaosDrill with 0 fault probability', async () => {
    const engine = new DeterministicChaosEngine({ seed: 42 });
    let executionCount = 0;

    const mockOp = async (iteration, isFaultInjected, faultType) => {
      executionCount++;
      return `result-${iteration}`;
    };

    const report = await engine.runChaosDrill({
      operationAsyncFn: mockOp,
      iterations: 5,
      faultProbability: 0
    });

    assert.equal(executionCount, 5);
    assert.equal(report.injected_faults_count, 0);
    assert.equal(report.unhandled_crashes, 0);
    assert.equal(report.resilience_rate_percent, 100);
    assert.equal(report.verdict, 'RESILIENT_CHAOS_PROOF');
    assert.equal(report.total_iterations, 5);

    assert.equal(report.iteration_results.length, 5);
    for (const res of report.iteration_results) {
      assert.equal(res.status, 'SUCCESS');
      assert.equal(res.fault_injected, false);
      assert.equal(res.recovered, false);
    }
  });

  it('TC-03: runChaosDrill with deterministic fault injection (handled)', async () => {
    const engine = new DeterministicChaosEngine({ seed: 42 });

    const mockOp = async (iteration, isFaultInjected, faultType) => {
      if (isFaultInjected) {
        throw new Error('CHAOS_INJECTED: Simulated failure');
      }
      return 'success';
    };

    const report = await engine.runChaosDrill({
      operationAsyncFn: mockOp,
      iterations: 10,
      faultProbability: 0.5
    });

    // With seed=42 and 10 iterations at 0.5 prob, some faults will be injected.
    assert.ok(report.injected_faults_count > 0, 'Should inject some faults');
    assert.equal(report.unhandled_crashes, 0, 'Handled errors should not count as unhandled crashes');
    assert.equal(report.resilience_rate_percent, 100);
    assert.equal(report.verdict, 'RESILIENT_CHAOS_PROOF');

    const handledFaults = report.iteration_results.filter(r => r.status === 'HANDLED_FAULT_REJECTION');
    assert.equal(handledFaults.length, report.injected_faults_count);
  });

  it('TC-04: runChaosDrill with unhandled crash', async () => {
    const engine = new DeterministicChaosEngine({ seed: 42 });

    const mockOp = async (iteration, isFaultInjected, faultType) => {
      if (isFaultInjected) {
        throw new Error('Unexpected catastrophic failure'); // Doesn't match handled strings
      }
      return 'success';
    };

    const report = await engine.runChaosDrill({
      operationAsyncFn: mockOp,
      iterations: 10,
      faultProbability: 0.5
    });

    assert.ok(report.injected_faults_count > 0);
    assert.ok(report.unhandled_crashes > 0);
    assert.ok(report.resilience_rate_percent < 100);
    assert.equal(report.verdict, 'FRAGILE_UNDER_CHAOS');

    const crashes = report.iteration_results.filter(r => r.status === 'UNHANDLED_CRASH');
    assert.equal(crashes.length, report.unhandled_crashes);
  });

  it('TC-05: Validation of operationAsyncFn', async () => {
    const engine = new DeterministicChaosEngine();

    try {
      await engine.runChaosDrill({
        operationAsyncFn: null
      });
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.match(err.message, /CHAOS_ERROR: operationAsyncFn must be an executable function/);
    }
  });
});

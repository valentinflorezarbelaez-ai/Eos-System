import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AutonomousBenchmarkHarnessEngine } from '../src/core/benchmark/autonomous-benchmark-harness-engine.js';

describe('AutonomousBenchmarkHarnessEngine', () => {
  it('should initialize with default scenarios', () => {
    const engine = new AutonomousBenchmarkHarnessEngine();
    assert.ok(engine.benchmarks.has('SWE-001-CORRECTNESS'));
    assert.ok(engine.benchmarks.has('SWE-002-CAUSAL-REFACTOR'));
  });

  it('should allow registering new scenarios', () => {
    const engine = new AutonomousBenchmarkHarnessEngine();
    engine.registerScenario({
      id: 'CUSTOM-001',
      title: 'Custom Test',
      domain: 'TESTING',
      difficulty: 'EASY',
      testSuite: []
    });
    assert.ok(engine.benchmarks.has('CUSTOM-001'));
  });

  it('should evaluate candidate to PASS for SWE-001-CORRECTNESS when completely correct', () => {
    const engine = new AutonomousBenchmarkHarnessEngine();
    const candidateFn = (arr, target) => {
      let left = 0;
      let right = arr.length - 1;
      while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
      }
      return -1;
    };

    const receipt = engine.evaluateCandidate('SWE-001-CORRECTNESS', candidateFn);

    assert.equal(receipt.classification, 'SWE_BENCH_PASS');
    assert.equal(receipt.passed_tests, 4);
    assert.equal(receipt.total_tests, 4);
    assert.equal(receipt.pass_rate, 100);
    assert.ok(receipt.sha256, 'Should generate a sha256 hash');
  });

  it('should evaluate candidate to PARTIAL_PASS for SWE-001-CORRECTNESS', () => {
    const engine = new AutonomousBenchmarkHarnessEngine();
    const candidateFn = (arr, target) => {
      // Intentionally hardcode partial success
      if (target === 5) return 2;
      return -2; // Fail other cases
    };

    const receipt = engine.evaluateCandidate('SWE-001-CORRECTNESS', candidateFn);

    assert.equal(receipt.classification, 'PARTIAL_PASS');
    assert.equal(receipt.passed_tests, 1);
    assert.equal(receipt.total_tests, 4);
    assert.equal(receipt.pass_rate, 25);
    assert.equal(receipt.failures.length, 3);
  });

  it('should evaluate candidate to FAIL for SWE-001-CORRECTNESS', () => {
    const engine = new AutonomousBenchmarkHarnessEngine();
    const candidateFn = (arr, target) => -2; // Always wrong

    const receipt = engine.evaluateCandidate('SWE-001-CORRECTNESS', candidateFn);

    assert.equal(receipt.classification, 'FAIL');
    assert.equal(receipt.passed_tests, 0);
    assert.equal(receipt.total_tests, 4);
    assert.equal(receipt.pass_rate, 0);
    assert.equal(receipt.failures.length, 4);
  });

  it('should handle exceptions in candidate function', () => {
    const engine = new AutonomousBenchmarkHarnessEngine();
    const candidateFn = (arr, target) => {
      throw new Error('Candidate crashed');
    };

    const receipt = engine.evaluateCandidate('SWE-001-CORRECTNESS', candidateFn);

    assert.equal(receipt.classification, 'FAIL');
    assert.equal(receipt.passed_tests, 0);
    assert.equal(receipt.failures.length, 4);
    assert.equal(receipt.failures[0].error, 'Candidate crashed');
  });

  it('should support inputState/delta scenarios like SWE-002-CAUSAL-REFACTOR', () => {
    const engine = new AutonomousBenchmarkHarnessEngine();
    const candidateFn = (state, delta) => {
      return { count: state.count + delta };
    };

    const receipt = engine.evaluateCandidate('SWE-002-CAUSAL-REFACTOR', candidateFn);

    assert.equal(receipt.classification, 'SWE_BENCH_PASS');
    assert.equal(receipt.passed_tests, 2);
    assert.equal(receipt.total_tests, 2);
  });

  it('should throw an error if evaluating an unknown scenario', () => {
    const engine = new AutonomousBenchmarkHarnessEngine();
    assert.throws(() => {
      engine.evaluateCandidate('UNKNOWN-SCENARIO', () => {});
    }, /Scenario UNKNOWN-SCENARIO not found/);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { LongRunStabilityHarness } from '../scripts/engine/long-run-stability-harness.js';

// ====================================================
// WS-06: LONG-RUN STABILITY HARNESS TESTS
// ====================================================

const harness = new LongRunStabilityHarness();

test('WS-06.1: Long-Run Stability Harness executes 100 cycles without state degradation', () => {
  const res = harness.runMultiCycleSimulation(100);

  assert.equal(res.status, 'STABLE');
  assert.equal(res.cyclesExecuted, 100);
  assert.equal(res.metrics.heartbeatHealthy, true);
  assert.equal(res.metrics.stateTransitionsClean, true);
  assert.equal(res.metrics.rollbackRetained, true);
  assert.equal(res.metrics.revocationRetained, true);
  assert.equal(res.metrics.memoryLeakDetected, false);
});

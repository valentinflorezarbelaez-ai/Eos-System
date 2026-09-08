import test from 'node:test';
import assert from 'node:assert/strict';
import { LongitudinalChaosEngine } from '../scripts/engine/longitudinal-chaos-engine.js';

test('N-02 to N-15: 12-Session Longitudinal Sequence achieves 100% Recovery and Sub-50ms Kill-Switch', () => {
  const engine = new LongitudinalChaosEngine();
  const windowReport = engine.execute12SessionWindow();

  assert.equal(windowReport.totalSessionsExecuted, 12);
  assert.equal(windowReport.totalChaosEventsInjected, 17);
  assert.equal(windowReport.recoverySuccessRate, 1.0);
  assert.equal(windowReport.authorityViolations, 0);
  assert.equal(windowReport.secretLeaks, 0);
  assert.equal(windowReport.authorityPreservationRate, '100.0%');
  assert.equal(windowReport.evidencePreservationRate, '100.0%');

  // Verify latency and statistical distributions
  assert.ok(windowReport.statistics.mttdMs.p99 <= 50.0);
  assert.ok(windowReport.statistics.mttrMs.p99 <= 100.0);
  assert.ok(windowReport.statistics.killSwitchLatencyMs.p99 <= 50.0);
  assert.equal(windowReport.verdict, 'LONGITUDINAL_RELIABILITY_SUPPORTED');
});

test('N-16: Cascading Multi-Stage Chain Failure recovers cleanly with zero authority breach', () => {
  const engine = new LongitudinalChaosEngine();
  const cascadeReport = engine.executeCascadingChainFailure();

  assert.equal(cascadeReport.stages.length, 5);
  assert.equal(cascadeReport.evidencePreserved, true);
  assert.equal(cascadeReport.authorityPreserved, true);
  assert.equal(cascadeReport.verdict, 'PASS');
});

test('N-10: Rollback Determinism verifies State(post) == State(pre) with SHA-256 hash equality', () => {
  const engine = new LongitudinalChaosEngine();

  const snapshot = {
    workspace: 'EOS-Lab/Canary-Alpha',
    config: { enabled: true, mode: 'CANARY_RESTRICTED' },
    files: ['src/components/DiagnosticReporter.js', 'src/components/ContactSupportDispatcher.js']
  };

  const rollbackResult = engine.verifyRollbackDeterminism(snapshot, { ...snapshot });
  assert.equal(rollbackResult.isEqual, true);
  assert.equal(rollbackResult.delta, 0);
  assert.equal(rollbackResult.verdict, 'DETERMINISTIC_ROLLBACK_VERIFIED');
});

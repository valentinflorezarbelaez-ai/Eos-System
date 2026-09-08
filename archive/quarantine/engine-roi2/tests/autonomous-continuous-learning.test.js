import test from 'node:test';
import assert from 'node:assert/strict';
import { AutonomousContinuousLearningLoop } from '../scripts/engine/autonomous-continuous-learning-loop.js';

test('Continuous Learning: Executes Kaizen improvement cycle refining BKMs without privilege escalation', () => {
  const engine = new AutonomousContinuousLearningLoop();
  const record = engine.runKaizenCycle();

  assert.ok(record.cycleId.startsWith('KAIZEN-'));
  assert.ok(record.tracesScanned > 0);
  assert.equal(record.shadowTrials.passedSimulations, 10);
  assert.equal(record.shadowTrials.sideEffectsToCore, 0);
  assert.equal(record.shadowTrials.targetFundacionDelta, 0);

  // Assert Governance Invariants
  assert.equal(record.governanceValidation.selfImprovementAchieved, true);
  assert.equal(record.governanceValidation.privilegeEscalationAttempted, false);
  assert.equal(record.governanceValidation.coreKernelState, 'FROZEN');
  assert.equal(record.governanceValidation.targetFundacionState, 'FROZEN (Delta = 0)');
  assert.equal(record.governanceValidation.autonomyLevelPreserved, 'LEVEL_2_SUPERVISED_AUTONOMY');
  assert.equal(record.signatureSha256.length, 64);
});

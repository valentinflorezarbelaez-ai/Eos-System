import test from 'node:test';
import assert from 'node:assert/strict';
import { CausalReplicationHarness } from '../scripts/engine/causal-replication-harness.js';

// ====================================================
// EXECUTIVE-META-LEARNING-004 E2E TESTS
// ====================================================

const harness = new CausalReplicationHarness();

test('EXECUTIVE-META-LEARNING-004: Multi-family replication, spurious filtering and Zero False Learning Rate', () => {
  const result = harness.runMetaLearning004Experiment();

  assert.equal(result.status, 'EXECUTIVE_META_LEARNING_004_PASSED');
  assert.equal(result.epistemicDisciplineVerdict, 'ZERO_FALSE_LEARNING_MAINTAINED');

  // Assert exactly 2 genuine causal BKMs were promoted
  assert.equal(result.experimentResults.promotedBkms.length, 2);
  assert.equal(result.experimentResults.promotedBkms[0].domainScope, 'CONVERSION_LANDING_PAGES');
  assert.equal(result.experimentResults.promotedBkms[1].domainScope, 'REALTIME_ANALYTICS_DASHBOARDS');

  // Assert spurious candidate was properly rejected
  assert.equal(result.experimentResults.rejectedSpuriousLessons.length, 1);
  assert.equal(result.experimentResults.rejectedSpuriousLessons[0].reason, 'REJECTED_AS_SPURIOUS_CORRELATION');

  // Assert False Learning Rate is strictly 0.0
  assert.equal(result.experimentResults.falseLearningRate, 0.0);
});

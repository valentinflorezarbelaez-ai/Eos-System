import test from 'node:test';
import assert from 'node:assert/strict';
import { TransferAndUnlearningHarness } from '../scripts/engine/transfer-and-unlearning-harness.js';

// ====================================================
// TRANSFER & UNLEARNING TESTS (002 & 003)
// ====================================================

const harness = new TransferAndUnlearningHarness();

test('EXECUTIVE-META-LEARNING-002: Demonstrates generalized learning transfer to unseen domain', () => {
  const transferResult = harness.runTransferExperiment();

  assert.equal(transferResult.status, 'TRANSFER_EXPERIMENT_SUCCESSFUL');
  assert.equal(transferResult.transferredDomain, 'MULTI_STEP_ONBOARDING');
  assert.equal(transferResult.transferVerdict, 'LEARNING_TRANSFERRED_SUCCESSFULLY_TO_NEW_DOMAIN');
  assert.ok(transferResult.outcomeScore >= 9.5);
});

test('EXECUTIVE-META-LEARNING-003: Proves negative learning, drift detection, and audited unlearning/rollback', () => {
  const unlearnResult = harness.runUnlearningExperiment();

  assert.equal(unlearnResult.status, 'NEGATIVE_LEARNING_AND_UNLEARNING_VERIFIED');
  assert.equal(unlearnResult.unlearnedCorruptedBelief, true);
  // Assert corrupted BKM was rolled back and legacy verified BKM restored
  assert.equal(unlearnResult.finalActiveBkm, 'BKM-LEGACY-TOOL-X');
});

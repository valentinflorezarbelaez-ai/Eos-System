import test from 'node:test';
import assert from 'node:assert/strict';
import { AutonomousFailsafeHarness } from '../scripts/engine/autonomous-failsafe-harness.js';

test('Failsafe Harness: Blocks unsafe mutations and destructive commands before execution', () => {
  const harness = new AutonomousFailsafeHarness();

  // 1. Blocked Fundacion write
  const res1 = harness.verifySafetyBeforeExecution({ targetPath: 'C:\\Users\\valen\\Documents\\Fundacion\\app.js' });
  assert.equal(res1.safeToExecute, false);
  assert.equal(res1.errorClass, 'UNAUTHORIZED_TARGET_WRITE_VIOLATION');

  // 2. Blocked Core kernel write
  const res2 = harness.verifySafetyBeforeExecution({ targetPath: 'scripts/engine/core/kernel.js' });
  assert.equal(res2.safeToExecute, false);
  assert.equal(res2.errorClass, 'CORE_KERNEL_MUTATION_VIOLATION');

  // 3. Blocked destructive command
  const res3 = harness.verifySafetyBeforeExecution({ command: 'rm -rf /' });
  assert.equal(res3.safeToExecute, false);
  assert.equal(res3.errorClass, 'DESTRUCTIVE_COMMAND_BLOCKED');

  // 4. Safe canary action
  const res4 = harness.verifySafetyBeforeExecution({ targetPath: 'EOS-Lab/Canary-Real-001/src/app.js' });
  assert.equal(res4.safeToExecute, true);
  assert.ok(res4.executionTraceId.startsWith('TRC-SAFE-'));
});

test('Failsafe Harness: Executes Self-Healing TDD loop proposing verified remediation patches', () => {
  const harness = new AutonomousFailsafeHarness();

  const failedTest = {
    testName: 'TDD-03: Sanitization before ARIA',
    failureMessage: 'AssertionError: sanitizeInput is not defined',
    componentFile: 'StepQualificationForm.js'
  };

  const remediation = harness.executeSelfHealingLoop(failedTest);
  assert.equal(remediation.rootCause, 'UNSANITIZED_EDGE_INPUT');
  assert.ok(remediation.suggestedPatch.includes('sanitizeInput()'));
  assert.equal(remediation.status, 'AUTO_PATCH_PROPOSED_FOR_VERIFICATION');
});

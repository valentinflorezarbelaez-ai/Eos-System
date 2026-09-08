import test from 'node:test';
import assert from 'node:assert/strict';
import { LearningRobustnessHarness } from '../scripts/engine/learning-robustness-harness.js';

// ====================================================
// EXECUTIVE-LEARNING-ROBUSTNESS-001 E2E TESTS
// ====================================================

const harness = new LearningRobustnessHarness();

test('EXECUTIVE-LEARNING-ROBUSTNESS-001: Validates Context, Tool, User, Constraint shifts and conflict specialization', () => {
  const e2eResult = harness.runRobustnessExperiments();

  assert.equal(e2eResult.status, 'LEARNING_ROBUSTNESS_001_PASSED');
  assert.equal(e2eResult.falseGeneralizationPrevented, true);

  // Probe 1: Context Shift (Mobile-First Touch) -> Selects BKM_MOBILE_FIRST
  assert.equal(e2eResult.results.contextShift.action, 'REUSE');
  assert.equal(e2eResult.results.contextShift.shiftDetected, 'CONTEXT_SHIFT_MOBILE');
  assert.equal(e2eResult.results.contextShift.selectedBkm.portfolioKey, 'BKM_MOBILE_FIRST');

  // Probe 2: Tool Shift (Missing Preferred Tool) -> Triggers RESEARCH
  assert.equal(e2eResult.results.toolShift.action, 'RESEARCH');
  assert.equal(e2eResult.results.toolShift.shiftDetected, 'TOOL_SHIFT_MISSING_PRIMARY');

  // Probe 3: User Shift (Accessibility Priority) -> Selects BKM_A11Y_FIRST
  assert.equal(e2eResult.results.userShift.action, 'REUSE');
  assert.equal(e2eResult.results.userShift.shiftDetected, 'USER_SHIFT_ACCESSIBILITY');
  assert.equal(e2eResult.results.userShift.selectedBkm.portfolioKey, 'BKM_A11Y_FIRST');

  // Probe 4: Constraint Shift (Low Budget Trivial Fix) -> Selects BKM_LOW_COST_LEAN
  assert.equal(e2eResult.results.constraintShift.action, 'REUSE');
  assert.equal(e2eResult.results.constraintShift.shiftDetected, 'CONSTRAINT_SHIFT_BUDGET');
  assert.equal(e2eResult.results.constraintShift.selectedBkm.portfolioKey, 'BKM_LOW_COST_LEAN');

  // Probe 5: Conflict Resolution -> Narrows parent scope without erasing
  assert.equal(e2eResult.results.conflictResolution.actionTaken, 'NARROWED_PARENT_SCOPE_AND_SPAWNED_CONTEXTUAL_RULE');
});

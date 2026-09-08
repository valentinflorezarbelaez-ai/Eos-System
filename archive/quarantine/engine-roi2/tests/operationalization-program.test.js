import test from 'node:test';
import assert from 'node:assert/strict';
import { OperationalizationProgramEngine } from '../scripts/engine/operationalization-program.js';

// ====================================================
// EOS OPERATIONALIZATION PROGRAM TESTS (OP-01..07)
// ====================================================

const engine = new OperationalizationProgramEngine();

test('Triple Epistemic Gate: Evaluates shouldWeBuild, isOptimalWay, and didItWork', () => {
  // Test 1: User outcome failure blocks gate
  const failedOutcome = engine.evaluateTripleQuestionGating({
    jtbdGoal: 'Feature X',
    userNeedConfirmed: true,
    economicSustainabilityScore: 9.0,
    measuredHumanOutcome: { taskCompletionRate: 0.70, trustScore: 6.0 }
  });
  assert.equal(failedOutcome.allQuestionsPassed, false);
  assert.equal(failedOutcome.didItWork, false);
  assert.equal(failedOutcome.verdict, 'TRIPLE_EPISTEMIC_GATE_FAILED');

  // Test 2: All 3 questions pass
  const passedGate = engine.evaluateTripleQuestionGating({
    jtbdGoal: 'Accessible Checkout Modal',
    userNeedConfirmed: true,
    economicSustainabilityScore: 9.8,
    measuredHumanOutcome: { taskCompletionRate: 0.97, trustScore: 9.5 }
  });
  assert.equal(passedGate.allQuestionsPassed, true);
  assert.equal(passedGate.verdict, 'TRIPLE_EPISTEMIC_GATE_PASSED');
});

test('OP-01: Read-Only Discovery runs with zero mutations and computes hash', () => {
  const res = engine.executeOp01Discovery('tests/fixtures/mission-projects/synthetic-website');
  assert.equal(res.mode, 'READ_ONLY');
  assert.equal(res.mutationsAttempted, 0);
  assert.ok(res.discoveryHash.length === 64);
  assert.equal(res.verdict, 'OP01_READ_ONLY_DISCOVERY_COMPLETED');
});

test('OP-02: Capability Acquisition selects sandboxed tool and issues least privilege token', () => {
  const res = engine.executeOp02CapabilityAcquisition('HEADLESS_A11Y');
  assert.equal(res.acquiredTool.sandboxed, true);
  assert.equal(res.acquiredTool.tokenIssued, 'LEAST_PRIVILEGE_TOKEN');
  assert.equal(res.verdict, 'OP02_CAPABILITY_AUTONOMOUSLY_ACQUIRED');
});

test('OP-03: OpenSpec Execution Loop verifies all 8 canonical lifecycle stages', () => {
  const res = engine.executeOp03OpenSpecLoop('CHG-OP-001');
  assert.equal(res.completedStagesCount, 8);
  assert.equal(res.cognitiveGraphSynced, true);
  assert.equal(res.verdict, 'OP03_OPENSPEC_LOOP_EXECUTED');
});

test('OP-04: Branch Mutation proves rollback capability and maintains main branch isolation', () => {
  const res = engine.executeOp04BranchMutation('branch-op-test');
  assert.equal(res.isolatedFromMain, true);
  assert.equal(res.rollbackProved, true);
  assert.equal(res.verdict, 'OP04_BRANCH_MUTATION_AND_ROLLBACK_PROVEN');
});

test('OP-05..07: Validates user outcomes, causal learning persistence, and clean-room reproduction (3/3)', () => {
  const uRes = engine.executeOp05UserValidation({ taskCompletionRate: 0.96, trustScore: 9.4, dropOffRate: 0.04 });
  assert.equal(uRes.validated, true);

  const lRes = engine.executeOp06CausalLearning({ id: 'BKM-CAL-01' });
  assert.equal(lRes.memoryRecord.persistedInEngram, true);

  const cRes = engine.executeOp07CleanRoomReproduction('ENV-B-COLD');
  assert.equal(cRes.reproductionsSuccessful, 3);
  assert.equal(cRes.invariantsIdentical, true);
});

test('Full Operationalization Program: Executes end-to-end OP-01 through OP-07 cleanly', () => {
  const fullRun = engine.executeFullOperationalizationProgram('Deliver accessible booking calendar');
  assert.equal(fullRun.allStepsSuccessful, true);
  assert.equal(fullRun.tripleGate.allQuestionsPassed, true);
  assert.equal(fullRun.verdict, 'EOS_OPERATIONALIZATION_PROGRAM_001_COMPLETED');
});

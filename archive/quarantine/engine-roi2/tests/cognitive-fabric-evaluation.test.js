import test from 'node:test';
import assert from 'node:assert/strict';
import { CognitiveFabricEvaluationHarness } from '../scripts/engine/cognitive-fabric-evaluation-harness.js';

// ====================================================
// EOS COGNITIVE FABRIC EVALUATION TESTS (CF-EVAL-001..008)
// ====================================================

const harness = new CognitiveFabricEvaluationHarness();

test('CF-EVAL-001: Measures progressive integration gain across Control -> Var A -> Var B -> Var C', () => {
  const result = harness.runIntegrationGainExperiment({ mission: 'Accessible High-Performance Web Architecture' });

  assert.equal(result.experimentId, 'CF-EVAL-001');
  assert.equal(result.variants.length, 4);
  assert.equal(result.deltas.totalGain, 3.05);
  assert.equal(result.reworkReductionPct, 100.0);
  assert.ok(result.latencyReductionPct > 50.0);
  assert.equal(result.verdict, 'PROGRESSIVE_INTEGRATION_GAIN_CONFIRMED');
});

test('CF-EVAL-002: Demonstrates Graph Reasoning superiority over flat memory', () => {
  const graphEval = harness.evaluateGraphGain();
  assert.equal(graphEval.evalId, 'CF-EVAL-002');
  assert.equal(graphEval.graphPrecision, 0.96);
  assert.ok(graphEval.precisionDeltaPct > 40.0);
  assert.equal(graphEval.verdict, 'GRAPH_REASONING_SUPERIORITY_VERIFIED');
});

test('CF-EVAL-003 & CF-EVAL-004: Guided Search & Step Verification eliminates branch failures', () => {
  const searchEval = harness.evaluateSearchAndStepVerification();
  assert.equal(searchEval.guidedSearchFailureRate, 0.0);
  assert.equal(searchEval.failureRateDeltaPct, -100.0);
  assert.equal(searchEval.prunedUnsafeCount, 2);
  assert.equal(searchEval.verdict, 'GUIDED_SEARCH_STEP_VERIFICATION_ELIMINATES_BRANCH_FAILURES');
});

test('CF-EVAL-005 & CF-EVAL-006: Validates Blast Radius budgeting and Neuro-Symbolic counterexample detection', () => {
  const utilityEval = harness.evaluateBlastRadiusAndFormalUtility();
  assert.equal(utilityEval.blastRadiusAccurate, true);
  assert.equal(utilityEval.formalCounterexampleCaught, true);
  assert.equal(utilityEval.verdict, 'BLAST_RADIUS_AND_NEURO_SYMBOLIC_UTILITY_CONFIRMED');
});

test('CF-EVAL-007 & CF-EVAL-008: Real Tool / MCP Sandbox Pilot & Independent End-to-End Audit Scorecard', () => {
  const { pilotResults, scorecard } = harness.executeRealToolPilotAndIndependentAudit();

  assert.equal(pilotResults.sandboxedExecution, 'ZERO_PRIVILEGE_ESCALATION');
  assert.equal(pilotResults.zeroUnauthorizedDelta, true);
  assert.equal(scorecard.executorIsCertifier, false);
  assert.equal(scorecard.status, 'COGNITIVE_FABRIC_INTEGRATION_CERTIFIED_PASS');
  assert.ok(scorecard.epistemicScorecard.overallConfidence >= 0.95);
});

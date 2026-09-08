import test from 'node:test';
import assert from 'node:assert/strict';
import { ClosedLoopLearningEngine } from '../scripts/engine/closed-loop-learning-engine.js';

// ====================================================
// CLOSED-LOOP META-LEARNING & SELF-OPTIMIZATION TESTS
// ====================================================

const engine = new ClosedLoopLearningEngine();

test('EXECUTIVE-META-LEARNING-001: Demonstrates measurable Learning Gain between Round 1 (Cold) and Round 2 (Warm)', () => {
  const result = engine.measureLearningGain('HIGH_CONVERSION_LANDING_PAGE');

  // Verify learning gain is positive and substantial
  assert.ok(result.metrics.learningGain > 2.0, 'Learning gain must exceed +2.0 composite points');
  assert.ok(result.metrics.reworkReductionPct >= 90.0, 'Rework reduction must exceed 90%');
  assert.ok(result.metrics.speedupPct >= 60.0, 'Speedup must exceed 60%');
  assert.equal(result.metrics.verdict, 'SIGNIFICANT_EMPIRICAL_LEARNING_GAIN');
  assert.equal(result.round2Warm.appliedBkm, 'STRAT-PARALLEL-TRUST');
});

test('CONTEXTUAL-BKM-001: Proves Belief Revision & Contextual Scope Narrowing against dogmatism', () => {
  const revisionResult = engine.reviseAndNarrowBkmScope(
    'LANDING_PAGES',
    'mobile_first',
    { strategyId: 'STRAT-MOBILE-FIRST-FLUID', name: 'Mobile First Fluid Gestures', contextScore: 9.8 }
  );

  assert.equal(revisionResult.action, 'BELIEF_REVISION_AND_SCOPE_NARROWING_EXECUTED');
  assert.equal(revisionResult.previousBkm.scope, 'DESKTOP_AND_GENERAL_ONLY');
  assert.equal(revisionResult.newContextualBkm.strategyId, 'STRAT-MOBILE-FIRST-FLUID');
  assert.equal(revisionResult.dogmatismPrevented, true);
});

test('ECOSYSTEM-ADOPTION-001 & CLOSED-LOOP-IMPROVEMENT-001: Executes 10-step full closed loop adoption without privilege escalation', () => {
  const resourceCandidate = {
    name: '@official/advanced-visual-qa-mcp',
    version: '2.1.0',
    sourceUrl: 'https://github.com/official/visual-qa',
    isOfficialSource: true,
    hasSignedProvenance: true,
    dependencyAuditPass: true,
    protocolType: 'MCP_MANIFEST',
    capabilities: ['CAP-VISUAL-PERCEPTUAL-DIFF'],
    benchmarkScore: 9.6
  };

  const adoptionResult = engine.runCompleteAdoptionAndClosedLoopCycle(resourceCandidate, 'TOL-MOCK-BROWSER');

  assert.equal(adoptionResult.status, 'CLOSED_LOOP_CYCLE_COMPLETED');
  assert.equal(adoptionResult.trace.length, 5);
  assert.equal(adoptionResult.proposal.status, 'PENDING_GOVERNANCE_SIGN_OFF');
  assert.equal(adoptionResult.proposal.requiresGovernanceApproval, true);
  assert.equal(adoptionResult.governedSafetyBoundaryPreserved, true);
});

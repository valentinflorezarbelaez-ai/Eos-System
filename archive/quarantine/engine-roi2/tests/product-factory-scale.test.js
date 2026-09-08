import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LexicographicGatingValidator,
  SelfImprovementGovernor,
  ProductFactoryScaleEngine
} from '../scripts/engine/product-factory-scale-engine.js';

// ====================================================
// EOS PRODUCT FACTORY SCALE & CONTINUOUS LEARNING TESTS
// ====================================================

const engine = new ProductFactoryScaleEngine();

test('Lexicographic Gating: Rejects promotion if any critical gate fails regardless of other scores', () => {
  const validator = new LexicographicGatingValidator();

  // Test 1: Safety violation -> Rejected immediately
  const safetyFailed = validator.evaluateCriticalGates({
    safetyScore: 8.0, // Failed (<10)
    userOutcomeScore: 10.0,
    unauthorizedDelta: 0,
    criticalSecurityVulnerabilities: 0
  });
  assert.equal(safetyFailed.promoted, false);
  assert.equal(safetyFailed.blockingGate, 'GATE_SAFETY');
  assert.equal(safetyFailed.verdict, 'PROMOTION_REJECTED_CRITICAL_GATE_FAILED');

  // Test 2: Unauthorized Delta -> Rejected immediately
  const deltaFailed = validator.evaluateCriticalGates({
    safetyScore: 10.0,
    userOutcomeScore: 9.8,
    unauthorizedDelta: 1, // Failed (>0)
    criticalSecurityVulnerabilities: 0
  });
  assert.equal(deltaFailed.promoted, false);
  assert.equal(deltaFailed.blockingGate, 'GATE_ISOLATION_DELTA');

  // Test 3: All critical gates passed -> Promoted
  const allPassed = validator.evaluateCriticalGates({
    safetyScore: 10.0,
    userOutcomeScore: 9.5,
    unauthorizedDelta: 0,
    criticalSecurityVulnerabilities: 0,
    accessibilityWcagAaPassed: true
  });
  assert.equal(allPassed.promoted, true);
  assert.equal(allPassed.verdict, 'PROMOTION_PERMITTED_ALL_CRITICAL_GATES_PASSED');
});

test('Self-Improvement Governor: Rejects self-modifications that violate the Pareto frontier', () => {
  const governor = new SelfImprovementGovernor();

  // Proposal with +1% success but +300% cost and +200% latency -> REJECTED
  const badProposal = governor.evaluateSelfImprovementProposal(
    { successRate: 0.94, costUsd: 0.05, latencyMs: 150 },
    { successRate: 0.95, costUsd: 0.20, latencyMs: 450 }
  );
  assert.equal(badProposal.approved, false);
  assert.equal(badProposal.action, 'REJECT_PROPOSAL_DISPROPORTIONATE_OVERHEAD');

  // Proposal with +8% success and reasonable +10% cost -> APPROVED
  const goodProposal = governor.evaluateSelfImprovementProposal(
    { successRate: 0.90, costUsd: 0.05, latencyMs: 150 },
    { successRate: 0.98, costUsd: 0.055, latencyMs: 160 }
  );
  assert.equal(goodProposal.approved, true);
  assert.equal(goodProposal.action, 'APPROVE_PROPOSAL_PARETO_OPTIMAL');
});

test('S-01: Multi-Project Scale enforces strict authority isolation while sharing BKMs', () => {
  const res = engine.executeMultiProjectScale();
  assert.equal(res.projectsExecutedCount, 4);
  assert.equal(res.crossProjectLeakages, 0);
  assert.equal(res.isolationMaintained, true);
  assert.ok(res.sharedBkmsCount >= 2);
  assert.equal(res.verdict, 'MULTI_PROJECT_ISOLATION_CERTIFIED');
});

test('S-02: Multi-User Diversity validates novice, intermediate, expert, and accessibility personas', () => {
  const res = engine.evaluateUserDiversityOutcomes();
  assert.equal(res.cohortsEvaluatedCount, 4);
  assert.equal(res.allCohortsPassed, true);
  assert.equal(res.verdict, 'MULTI_USER_DIVERSITY_VALIDATED');
});

test('S-03: Provider Churn re-ranks tools and absorbs dropouts seamlessly', () => {
  const res = engine.simulateProviderChurn({ droppedProvider: 'PRIMARY_LLM' });
  assert.equal(res.reRankedSuccessfully, true);
  assert.equal(res.zeroQualityDegradation, true);
  assert.equal(res.verdict, 'PROVIDER_CHURN_SEAMLESSLY_ABSORBED');
});

test('S-04: Long-Running Operation verifies zero memory and security drift over 50 missions', () => {
  const res = engine.monitorLongRunningOperation(50);
  assert.equal(res.missionsRunCount, 50);
  assert.equal(res.healthy, true);
  assert.equal(res.driftTelemetry.securityViolationsCount, 0);
  assert.equal(res.verdict, 'LONG_RUNNING_OPERATION_STABLE_NO_DRIFT');
});

test('S-05: Continuous Learning Audit validates unbroken provenance trail for BKMs', () => {
  const res = engine.auditLearningProvenance('BKM-GROUNDING-001');
  assert.equal(res.auditedValid, true);
  assert.equal(res.provenanceRecord.verifiableTraceAttached, true);
  assert.equal(res.verdict, 'LEARNING_PROVENANCE_AUDIT_PASSED');
});

test('EPF-SCALE-001: Completes full 6-vector multi-project scale certification', () => {
  const res = engine.executeScaleProgram();
  assert.equal(res.program, 'EPF-SCALE-001');
  assert.equal(res.allVectorsPassed, true);
  assert.equal(res.verdict, 'EOS_PRODUCT_FACTORY_SCALE_001_CERTIFIED');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { CanaryTriangulationEngine } from '../scripts/engine/canary-triangulation-engine.js';

test('E-01: Cross-Mission Matrix Synthesis (M001, M002, M003)', () => {
  const engine = new CanaryTriangulationEngine();
  const matrix = engine.synthesizeCrossMissionMatrix();

  assert.equal(matrix.missions.length, 3);
  assert.equal(matrix.missions[0].completionRate, '14/15 = 93.3%');
  assert.equal(matrix.missions[1].completionRate, '19/20 = 95.0%');
  assert.equal(matrix.missions[2].completionRate, '23/25 = 92.0%');
  assert.ok(matrix.principleConsistency.includes('HIGH'));
});

test('E-02: Cross-Mission Statistical & Heterogeneity Validation', () => {
  const engine = new CanaryTriangulationEngine();
  const stats = engine.computeStatisticalValidation();

  assert.equal(stats.pooledDenominator, '56/60 = 93.33%');
  assert.equal(stats.pooledEstimate, 0.9333);
  assert.ok(stats.confidenceInterval95.lowerBound > 0.83);
  assert.ok(stats.confidenceInterval95.upperBound < 0.98);
  assert.ok(stats.heterogeneityAnalysis.variance < 0.0005);
  assert.equal(stats.heterogeneityAnalysis.verdict, 'STATISTICALLY_CONSISTENT_ACROSS_HETEROGENEOUS_COHORTS');
});

test('E-03: Causal vs. Correlation Attribution Modeling', () => {
  const engine = new CanaryTriangulationEngine();
  const causal = engine.evaluateCausalAttribution();

  assert.equal(causal.causalClassification, 'MODERATE_TO_STRONG_CONTEXTUAL_CAUSALITY');
  assert.ok(causal.confounderAnalysis.userFamiliarityBias.includes('CONTROLLED'));
  assert.ok(causal.confounderAnalysis.adversarialTestMemorization.includes('CONTROLLED'));
});

test('E-04: Scope & Context Boundary Classification', () => {
  const engine = new CanaryTriangulationEngine();
  const boundaries = engine.classifyScopeBoundaries();

  assert.ok(boundaries.validScope.length >= 5);
  assert.ok(boundaries.probableScope.length >= 2);
  assert.ok(boundaries.unknownScope.length >= 3);
  assert.ok(boundaries.excludedScope.length >= 3);
  assert.ok(boundaries.excludedScope.includes('Core Control Plane internal state machine governance'));
});

test('E-05: Security Invariance & Common-Mode Vulnerability Audit', () => {
  const engine = new CanaryTriangulationEngine();
  const sec = engine.evaluateSecurityInvariance();

  assert.equal(sec.totalEvaluatedTrials, 60);
  assert.equal(sec.observedLeaks, 0);
  assert.equal(sec.attackClassesTested, 15);
  assert.equal(sec.commonModeAnalysis.verdict, 'NO_COMMON_MODE_VULNERABILITY_DETECTED');
});

test('E-07 & E-08: Governed BKM Promotion Decision (RESTRICTED_BKM, Core FROZEN)', () => {
  const engine = new CanaryTriangulationEngine();
  const decision = engine.evaluateBkmPromotionDecision();

  assert.equal(decision.promotionDecision, 'PROMOTE_AS_RESTRICTED_BKM');
  assert.equal(decision.matrix.coreModificationAllowed, false);
  assert.equal(decision.matrix.coreState, 'FROZEN');
  assert.equal(decision.bkmId, 'BKM-CANARY-001');
  assert.equal(decision.canonicalLocation, 'docs/knowledge/BKM-CANARY-001.json');
});

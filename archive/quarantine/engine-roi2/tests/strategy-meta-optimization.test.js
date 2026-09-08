import test from 'node:test';
import assert from 'node:assert/strict';
import { StrategyMetaOptimizationEngine } from '../scripts/engine/strategy-meta-optimization-engine.js';

// ====================================================
// EXECUTIVE-META-OPTIMIZATION-001 TESTS
// ====================================================

const engine = new StrategyMetaOptimizationEngine();

test('EXECUTIVE-META-OPTIMIZATION-001: Evaluates 3 workflows for Landing Page and selects Best Known Method', () => {
  const candidateStrategies = [
    {
      strategyId: 'STRAT-LINEAR',
      name: 'Strategy A: Pure Linear Pipeline',
      workflowSteps: ['Research', 'UX', 'Code', 'QA'],
      observedQuality: 8.0,
      observedUserValue: 7.5,
      latencyMinutes: 45,
      costScore: 8.0,
      riskScore: 8.0,
      reworkRate: 0.20
    },
    {
      strategyId: 'STRAT-PARALLEL-TRUST',
      name: 'Strategy B: Parallel Competitor Research & Trust Framework',
      workflowSteps: ['Parallel(Research, Competitors)', 'Parallel(UX, Trust-Signals)', 'Code', 'Parallel(QA, A11y)'],
      observedQuality: 9.6,
      observedUserValue: 9.8,
      latencyMinutes: 20,
      costScore: 8.5,
      riskScore: 9.5,
      reworkRate: 0.02
    },
    {
      strategyId: 'STRAT-MINIMALIST-RUSH',
      name: 'Strategy C: Direct Minimalist Rush',
      workflowSteps: ['UX', 'Code', 'QA'],
      observedQuality: 6.5,
      observedUserValue: 6.0,
      latencyMinutes: 10,
      costScore: 9.0,
      riskScore: 5.0,
      reworkRate: 0.35
    }
  ];

  const optimizationResult = engine.evaluateStrategyCandidates('HIGH_CONVERSION_LANDING_PAGE', candidateStrategies);

  // Strategy B must win based on higher user value, lower rework and superior quality
  assert.equal(optimizationResult.selectedBkm.bestKnownMethodId, 'STRAT-PARALLEL-TRUST');
  assert.ok(optimizationResult.selectedBkm.benchmarkScore >= 9.0);

  // Check that Strategy Memory persisted the Best Known Method
  const persistedBkm = engine.getBestKnownMethod('HIGH_CONVERSION_LANDING_PAGE');
  assert.notEqual(persistedBkm, null);
  assert.equal(persistedBkm.bestKnownMethodId, 'STRAT-PARALLEL-TRUST');
});

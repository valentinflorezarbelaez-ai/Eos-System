import test from 'node:test';
import assert from 'node:assert/strict';
import { CompositionPolicyEngine } from '../scripts/engine/composition-policy-engine.js';

test('K-02 & K-04: Strategy Selector handles all strategy classes (A, B, A->B, Constrained, Negative, Research)', () => {
  const engine = new CompositionPolicyEngine();

  // 1. Negative hard gate -> DO_NOT_COMPOSE
  const d1 = engine.selectCompositionStrategy({ isStreamingBinary: true });
  assert.equal(d1.strategy, 'DO_NOT_COMPOSE');

  // 2. Dual requirements -> A_THEN_B
  const d2 = engine.selectCompositionStrategy({ hasSecrets: true, requiresLiveGuidance: true, isReadOnly: false });
  assert.equal(d2.strategy, 'A_THEN_B');
  assert.equal(d2.selectedOrder, 'A_FIRST_THEN_B');

  // 3. Read only secrets -> A_ONLY
  const d3 = engine.selectCompositionStrategy({ hasSecrets: true, isReadOnly: true });
  assert.equal(d3.strategy, 'A_ONLY');

  // 4. Public survey -> B_ONLY
  const d4 = engine.selectCompositionStrategy({ hasSecrets: false, requiresLiveGuidance: true, isPublicUnauthenticated: true });
  assert.equal(d4.strategy, 'B_ONLY');

  // 5. Legacy high latency -> COMPOSE_WITH_CONSTRAINTS
  const d5 = engine.selectCompositionStrategy({ hasSecrets: true, requiresLiveGuidance: true, legacyParserLatencyMs: 350 });
  assert.equal(d5.strategy, 'COMPOSE_WITH_CONSTRAINTS');
  assert.ok(d5.constraints.includes('DEBOUNCE_FEEDBACK_300MS'));

  // 6. WASM canvas -> RESEARCH_FIRST
  const d6 = engine.selectCompositionStrategy({ isUncharacterizedCustomRuntime: true });
  assert.equal(d6.strategy, 'RESEARCH_FIRST');
});

test('K-03: Strategy Selection Benchmark evaluates 6 scenarios with 100% decision accuracy', () => {
  const engine = new CompositionPolicyEngine();
  const benchmark = engine.evaluateStrategySelectionBenchmark();

  assert.equal(benchmark.totalScenarios, 6);
  assert.equal(benchmark.correctCount, 6);
  assert.equal(benchmark.strategySelectionAccuracy, 1.0);
  assert.equal(benchmark.verdict, 'STRATEGY_SELECTION_ACCURACY_100_PERCENT');
});

test('K-05 & K-08: Policy Utility Model calculates Net Policy Utility as EOS_INTERNAL_METRIC', () => {
  const engine = new CompositionPolicyEngine();
  const util = engine.calculatePolicyUtility({
    outcomeGain: 20.0,
    costPenalty: 1.12,
    riskPenalty: 0.0,
    reworkPenalty: 0.0
  });

  assert.equal(util.metricClassification, 'EOS_INTERNAL_METRIC');
  assert.equal(util.policyUtility, 18.88);
  assert.equal(util.utilityVerdict, 'HIGH_POLICY_UTILITY');
});

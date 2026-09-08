import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TypedActionOntology,
  HermeticExecutionBundle,
  DistributedTraceCollector,
  ProgressiveDeliveryController,
  ElitePlatformEngine
} from '../scripts/engine/elite-platform-engine.js';

// ====================================================
// EOS ELITE PLATFORM ENGINEERING TESTS (EP-01..12)
// ====================================================

const platform = new ElitePlatformEngine();

test('EP-02: TypedActionOntology enforces strongly typed contracts and blocks dangerous actions', () => {
  const ontology = new TypedActionOntology();

  // Test 1: Valid authorized typed action
  const validAction = ontology.validateTypedAction({
    actionType: 'CREATE_FILE',
    targetResource: 'src/index.js',
    preconditionsMet: true,
    estimatedBlastRadius: 1,
    rollbackFeasible: true
  });
  assert.equal(validAction.valid, true);
  assert.equal(validAction.authorized, true);
  assert.equal(validAction.verdict, 'TYPED_ACTION_AUTHORIZED');

  // Test 2: Unrecognized arbitrary action -> Rejected
  const invalidAction = ontology.validateTypedAction({
    actionType: 'ARBITRARY_RAW_EXECUTE_BASH'
  });
  assert.equal(invalidAction.valid, false);
  assert.equal(invalidAction.authorized, false);
});

test('EP-04: HermeticExecutionBundle seals reproducible SHA-256 execution packages', () => {
  const hermetic = new HermeticExecutionBundle();
  const bundle = hermetic.generateExecutionBundle({
    missionId: 'MIS-HERMETIC-001',
    sourceRevision: 'commit-99f1a',
    seed: 1337
  });

  assert.equal(bundle.reproducibilityGuaranteed, true);
  assert.equal(bundle.status, 'HERMETIC_BUNDLE_SEALED');
  assert.ok(bundle.bundleHash.length === 64); // SHA-256
});

test('EP-05: DistributedTraceCollector measures latency, token usage, and cost across spans', () => {
  const collector = new DistributedTraceCollector();
  const trace = collector.collectTrace('MIS-TRACE-001');

  assert.equal(trace.spansCount, 5);
  assert.ok(trace.totalDurationMs <= 300);
  assert.ok(trace.totalCostUsd <= 0.10);
  assert.equal(trace.status, 'TRACE_RECORDED_EVIDENCE_ATTACHED');
});

test('EP-09 & EP-10: ProgressiveDeliveryController promotes cleanly and triggers circuit breaker on regression', () => {
  const controller = new ProgressiveDeliveryController();

  // Stage promotion
  const cleanPromo = controller.evaluatePromotionGate('SANDBOX', { securityViolations: 0, accessibilityScore: 9.9 }, {});
  assert.equal(cleanPromo.promoted, true);
  assert.equal(cleanPromo.nextStage, 'SHADOW');

  // Regression circuit breaker
  const brokenPromo = controller.evaluatePromotionGate('SANDBOX', { securityViolations: 1, accessibilityScore: 9.0 }, {});
  assert.equal(brokenPromo.promoted, false);
  assert.equal(brokenPromo.circuitBreakerTriggered, true);
  assert.equal(brokenPromo.reason, 'CRITICAL_DIMENSION_REGRESSION_BLOCKED');
});

test('Vertical Slice: Completes End-to-End Execution from Intent to Verified Delivery', () => {
  const result = platform.executeVerticalSlice('Deploy accessible payment gateway UI');

  assert.equal(result.verticalSliceSuccess, true);
  assert.equal(result.actionValidation.authorized, true);
  assert.equal(result.bundle.status, 'HERMETIC_BUNDLE_SEALED');
  assert.equal(result.delivery.promoted, true);
  assert.equal(result.verdict, 'ELITE_PLATFORM_VERTICAL_SLICE_PROVEN');
});

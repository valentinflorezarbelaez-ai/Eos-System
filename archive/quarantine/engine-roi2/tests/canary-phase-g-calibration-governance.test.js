import test from 'node:test';
import assert from 'node:assert/strict';
import { PredictionCalibrationEngine } from '../scripts/engine/prediction-calibration-engine.js';

test('G-01: Methodological Calibration & Internal Metric Classification', () => {
  const engine = new PredictionCalibrationEngine();
  const metric = engine.validateCalibrationMetrics({
    baselineError: 0.4800,
    predictedValue: 0.9300,
    actualValue: 0.9333
  });

  assert.equal(metric.metricClassification, 'EOS_INTERNAL_METRIC');
  assert.equal(metric.metricName, 'Learning-to-Prediction Gain (LPG)');
  assert.equal(metric.actualPredictionError, 0.0033);
  assert.equal(metric.learningToPredictionGain, 0.4767);
  assert.ok(metric.epistemicCaveat.includes('internal heuristic comparator'));
});

test('G-02: Prediction Calibration Ledger records calibrated entries without bias drift', () => {
  const engine = new PredictionCalibrationEngine();
  
  const entry = engine.recordPredictionEntry({
    predictionId: 'PRED-CANARY-F001',
    context: 'Tabular CSV Uploader PII and Formula Defense',
    bkmUsed: 'BKM-CANARY-001',
    predictedValue: 0.9300,
    actualValue: 0.9333,
    confidence: 0.95
  });

  assert.equal(entry.predictionId, 'PRED-CANARY-F001');
  assert.equal(entry.absoluteError, 0.0033);
  assert.equal(entry.calibrationBucket, 'HIGHLY_CALIBRATED');
  assert.equal(entry.biasClassification, 'WELL_CALIBRATED');
});

test('G-03: Cross-Domain Transfer Policy Benchmark achieves 100% decision accuracy', () => {
  const engine = new PredictionCalibrationEngine();
  const benchmark = engine.evaluateTransferPolicyBenchmark();

  assert.equal(benchmark.totalScenarios, 4);
  assert.equal(benchmark.correctDecisions, 4);
  assert.equal(benchmark.transferDecisionAccuracy, 1.0);
  assert.equal(benchmark.verdict, 'TRANSFER_POLICY_BENCHMARK_100_PERCENT');
});

test('G-05: BKM Lifecycle & Revalidation Drift Trigger', () => {
  const engine = new PredictionCalibrationEngine();

  // Fresh active BKM
  const activeBkm = {
    bkm_id: 'BKM-CANARY-001',
    last_validated: new Date().toISOString(),
    tool_dependencies: [{ name: 'VanillaJS', driftDetected: false }]
  };
  const activeAudit = engine.auditBkmLifecycle(activeBkm);
  assert.equal(activeAudit.status, 'ACTIVE_VALIDATED');
  assert.equal(activeAudit.revalidationRequired, false);

  // Stale BKM with tool drift
  const staleBkm = {
    bkm_id: 'BKM-LEGACY-002',
    last_validated: '2025-01-01T00:00:00Z',
    tool_dependencies: [{ name: 'ThirdPartySdk', driftDetected: true }]
  };
  const staleAudit = engine.auditBkmLifecycle(staleBkm);
  assert.equal(staleAudit.status, 'REVALIDATION_REQUIRED');
  assert.equal(staleAudit.revalidationRequired, true);
  assert.ok(staleAudit.activeTriggers.includes('EXPIRATION_TTL_EXCEEDED'));
  assert.ok(staleAudit.activeTriggers.includes('TOOL_DRIFT_DETECTED'));
});

test('G-08: Knowledge Economics Evaluator calculates value-to-cost ratio', () => {
  const engine = new PredictionCalibrationEngine();
  const eco = engine.evaluateKnowledgeEconomics({
    outcomeImprovement: 48.0, // +48% completion gain
    acquisitionCostUsd: 0.35,
    validationCostUsd: 0.30,
    maintenanceCostUsd: 0.05
  });

  assert.equal(eco.totalKnowledgeCostUsd, 0.70);
  assert.ok(eco.knowledgeValueRatio > 50.0);
  assert.equal(eco.economicVerdict, 'HIGH_ECONOMIC_EFFICIENCY');
});

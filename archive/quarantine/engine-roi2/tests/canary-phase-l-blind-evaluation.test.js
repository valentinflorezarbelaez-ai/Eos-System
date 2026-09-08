import test from 'node:test';
import assert from 'node:assert/strict';
import { BlindStrategyEvaluationEngine } from '../scripts/engine/blind-strategy-evaluation-engine.js';

test('L-01 & L-02: Blind Strategy Evaluation on UNSEEN_SET achieves 100% accuracy and 0.0% regret', () => {
  const engine = new BlindStrategyEvaluationEngine();
  const report = engine.executeBlindEvaluation();

  assert.equal(report.totalUnseenScenarios, 6);
  assert.equal(report.correctCount, 6);
  assert.equal(report.accuracyUnseen, 1.0); // 100% accuracy on unseen out-of-sample set
  assert.equal(report.meanPolicyRegret, 0.0); // Zero regret vs Oracle
  assert.equal(report.falseTransferRate, 0.0); // Zero false transfers
  assert.equal(report.abstentionPrecision, 1.0); // 100% precision when abstaining
  assert.equal(report.verdict, 'BLIND_GENERALIZATION_VERIFIED');
});

test('L-06: Risk-Sensitive Lexicographic Decision Gate immediately overrides strategy upon security leak', () => {
  const engine = new BlindStrategyEvaluationEngine();

  // Test with security leak
  const leakedAudit = { secretLeaksDetected: 1, criticalVulnerabilities: 0 };
  const gateResult = engine.evaluateRiskSensitiveLexicographicGate({ strategy: 'A_THEN_B' }, leakedAudit);
  assert.equal(gateResult.gateStatus, 'HARD_REJECT');
  assert.equal(gateResult.overriddenStrategy, 'DO_NOT_COMPOSE');

  // Test clean security audit
  const cleanAudit = { secretLeaksDetected: 0, criticalVulnerabilities: 0 };
  const cleanResult = engine.evaluateRiskSensitiveLexicographicGate({ strategy: 'A_THEN_B' }, cleanAudit);
  assert.equal(cleanResult.gateStatus, 'PASS');
  assert.equal(cleanResult.approvedStrategy, 'A_THEN_B');
});

test('L-08: Environmental Drift Simulation forces adaptive restriction or research gate', () => {
  const engine = new BlindStrategyEvaluationEngine();

  const baseFormContext = { domainType: 'FORM', isStreamingBinary: false, hasSecrets: true, requiresLiveGuidance: true };

  // Apply drift: Latency explodes in legacy runtime (> 300ms)
  const driftReport = engine.simulateEnvironmentalDrift(baseFormContext, { legacyParserLatencyMs: 380 });
  assert.equal(driftReport.adaptedStrategy, 'COMPOSE_WITH_CONSTRAINTS');
  assert.equal(driftReport.adaptationValid, true);

  // Apply drift: Runtime shifts to uncharacterized WebGPU WASM
  const wasmDrift = engine.simulateEnvironmentalDrift(baseFormContext, { isUncharacterizedCustomRuntime: true });
  assert.equal(wasmDrift.adaptedStrategy, 'RESEARCH_FIRST');
  assert.equal(wasmDrift.adaptationValid, true);
});

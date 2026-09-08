import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CanaryF001PredictiveTransferHarness } from '../scripts/engine/canary-f001-predictive-transfer-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// =========================================================================
// CANARY-F001: PREDICTIVE TRANSFER & BKM GENERALIZATION BATTERY
// =========================================================================

test('F001-01: Pre-registered prediction and mission artifacts exist', () => {
  const predictionDoc = path.join(rootDir, 'docs/missions/CANARY_F001/PREDICTION-F-001.md');
  const expediente = path.join(rootDir, 'docs/missions/CANARY_F001/MISSION_EXPEDIENTE.json');
  const spec = path.join(rootDir, 'docs/specs/canary/SPEC-0004-canary-csv-tabular-uploader.md');

  assert.ok(fs.existsSync(predictionDoc));
  assert.ok(fs.existsSync(expediente));
  assert.ok(fs.existsSync(spec));
});

test('F001-02: Negative Transfer Suitability Rejection (Anti-Dogmatism Check)', () => {
  const harness = new CanaryF001PredictiveTransferHarness();

  // Test streaming binary scenario (must reject BKM transfer)
  const binaryCheck = harness.evaluateTransferSuitability('STREAMING_BINARY_WEBSOCKETS');
  assert.equal(binaryCheck.decision, 'DO_NOT_TRANSFER');
  assert.equal(binaryCheck.antiDogmatismProven, true);

  // Test CSV tabular data scenario (must accept BKM transfer)
  const csvCheck = harness.evaluateTransferSuitability('TABULAR_CSV_BATCH_UPLOADER');
  assert.equal(csvCheck.decision, 'TRANSFER_SUPPORTED');
});

test('F001-03: Empirical Cohort Trials & Prediction Calibration (N=30)', () => {
  const harness = new CanaryF001PredictiveTransferHarness();
  const outcome = harness.evaluateF001HumanOutcomes();

  assert.equal(outcome.cohort, 'COHORT-CANARY-D4');
  assert.equal(outcome.sampleSize, 30);
  assert.equal(outcome.successes, 28);
  assert.equal(outcome.completionRateString, '28/30 = 93.33%');
  assert.equal(outcome.totalPiiLeaked, 0);
  assert.equal(outcome.totalFormulasLeaked, 0);

  // Prediction vs Actual Calibration Check
  assert.ok(Math.abs(outcome.predictionErrors.completionRateError) <= 0.05, 'Completion error must be within +/- 5%');
  assert.ok(Math.abs(outcome.predictionErrors.timeOnTaskErrorSeconds) <= 10.0, 'Time error must be within +/- 10s');
  assert.ok(outcome.learningToPredictionGain > 0.40, 'LPG metric must be positive and substantial');
  assert.equal(outcome.verdict, 'TRANSFER_SUPPORTED_AND_CALIBRATED');
});

test('F001-04: Adversarial Novelty Battery for Tabular Data (5 Novel Vectors)', () => {
  const harness = new CanaryF001PredictiveTransferHarness();
  const adv = harness.runAdversarialNoveltyBattery();

  assert.equal(adv.attacks.length, 5);
  assert.equal(adv.allNeutralized, true);
  assert.equal(adv.verdict, 'ADVERSARIAL_NOVELTY_BATTERY_NEUTRALIZED');
});

test('F001-05: Component Footprint and Parsing Latency (< 35 KB)', () => {
  const harness = new CanaryF001PredictiveTransferHarness();
  const perf = harness.auditF001Performance();

  assert.equal(perf.passed, true);
  assert.ok(perf.componentSizeKb < 35.0);
  assert.equal(perf.verdict, 'PERFORMANCE_BUDGET_MET');
});

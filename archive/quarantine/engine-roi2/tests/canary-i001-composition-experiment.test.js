import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CanaryI001CompositionExecutor } from '../scripts/engine/canary-i001-composition-executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// =========================================================================
// CANARY-I001: MULTI-BKM COMPOSITION 4-ARM OPERATIONAL EXPERIMENT
// =========================================================================

test('I001-01: Expediente, Hypothesis, Baseline, Protocol, and Spec artifacts exist', () => {
  const expediente = path.join(rootDir, 'docs/missions/CANARY_I001/MISSION_EXPEDIENTE.json');
  const hypothesis = path.join(rootDir, 'docs/missions/CANARY_I001/HYPOTHESIS.md');
  const baseline = path.join(rootDir, 'docs/missions/CANARY_I001/BASELINE.md');
  const protocol = path.join(rootDir, 'docs/missions/CANARY_I001/EXPERIMENT_PROTOCOL.md');
  const analysisPlan = path.join(rootDir, 'docs/missions/CANARY_I001/ANALYSIS_PLAN.md');
  const spec = path.join(rootDir, 'docs/specs/canary/SPEC-0005-canary-batch-param-migration-console.md');

  assert.ok(fs.existsSync(expediente));
  assert.ok(fs.existsSync(hypothesis));
  assert.ok(fs.existsSync(baseline));
  assert.ok(fs.existsSync(protocol));
  assert.ok(fs.existsSync(analysisPlan));
  assert.ok(fs.existsSync(spec));
});

test('I001-02: 4-Arm Operational Trial demonstrates Composite Synergy (Δ_comp = +20.0%)', () => {
  const executor = new CanaryI001CompositionExecutor();
  const results = executor.executeFourArmTrial();

  assert.equal(results.totalParticipants, 40);
  assert.equal(results.arms.control.completionRateString, '4/10 = 40.0%');
  assert.equal(results.arms.armA.completionRateString, '7/10 = 70.0%');
  assert.equal(results.arms.armB.completionRateString, '6/10 = 60.0%');
  assert.equal(results.arms.compositeArmAB.completionRateString, '9/10 = 90.0%');

  // Assert Composition Delta exceeds +10% threshold
  assert.equal(results.compositionDelta, 0.2000); // 90% - max(70%, 60%) = +20.0%
  assert.equal(results.compositionDeltaPercentage, '+20.0%');
  assert.equal(results.arms.compositeArmAB.secretLeaksObserved, 0);
  assert.equal(results.synergyConfirmed, true);
  assert.equal(results.verdict, 'COMPOSITION_SUPPORTED');
});

test('I001-03: Live Anti-Composition Guard enforces DO_NOT_COMPOSE on conflicting negative BKM', () => {
  const executor = new CanaryI001CompositionExecutor();
  const guardCheck = executor.evaluateLiveAntiCompositionGuard();

  assert.equal(guardCheck.evaluationOutcome, 'DO_NOT_COMPOSE');
  assert.equal(guardCheck.guardActive, true);
  assert.equal(guardCheck.antiDogmatismProven, true);
});

test('I001-04: Live Kill-Switch Latency Benchmark (< 50ms)', () => {
  const executor = new CanaryI001CompositionExecutor();
  const check = executor.verifyI001KillSwitch();

  assert.equal(check.killSwitchEngaged, true);
  assert.equal(check.compliant, true);
  assert.ok(check.latencyMs < 50);
  assert.equal(check.verdict, 'KILL_SWITCH_ACTIVE_AND_COMPLIANT');
});

test('I001-05: Live Rollback Determinism & Snapshot Checksum Equality (Δ=0)', () => {
  const executor = new CanaryI001CompositionExecutor();
  const rollback = executor.verifyI001Rollback();

  assert.equal(rollback.rollbackValid, true);
  assert.equal(rollback.unauthorizedDelta, 0);
  assert.equal(rollback.verdict, 'ROLLBACK_DETERMINISTIC_PASS');
});

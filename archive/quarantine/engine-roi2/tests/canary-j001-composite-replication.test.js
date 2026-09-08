import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CanaryJ001CompositeReplicationExecutor } from '../scripts/engine/canary-j001-composite-replication-executor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// =========================================================================
// CANARY-J001: MULTI-BKM COMPOSITION REPLICATION & ORDER DEPENDENCY
// =========================================================================

test('J001-01: Expediente, Hypothesis, Prediction, Baseline, Protocol, and Spec artifacts exist', () => {
  const expediente = path.join(rootDir, 'docs/missions/CANARY_J001/MISSION_EXPEDIENTE.json');
  const hypothesis = path.join(rootDir, 'docs/missions/CANARY_J001/HYPOTHESIS.md');
  const prediction = path.join(rootDir, 'docs/missions/CANARY_J001/PREDICTION-J-001.md');
  const baseline = path.join(rootDir, 'docs/missions/CANARY_J001/BASELINE.md');
  const protocol = path.join(rootDir, 'docs/missions/CANARY_J001/EXPERIMENT_PROTOCOL.md');
  const spec = path.join(rootDir, 'docs/specs/canary/SPEC-0006-canary-webhook-payload-dispatcher.md');
  const costLedger = path.join(rootDir, 'docs/governance/COMPOSITION_COST_LEDGER.json');

  assert.ok(fs.existsSync(expediente));
  assert.ok(fs.existsSync(hypothesis));
  assert.ok(fs.existsSync(prediction));
  assert.ok(fs.existsSync(baseline));
  assert.ok(fs.existsSync(protocol));
  assert.ok(fs.existsSync(spec));
  assert.ok(fs.existsSync(costLedger));
});

test('J001-02: 5-Arm Operational Trial proves Replication Synergy (Δ_comp = +20.0%) and Order Dependency (+30.0%)', () => {
  const executor = new CanaryJ001CompositeReplicationExecutor();
  const results = executor.executeFiveArmTrial();

  assert.equal(results.totalParticipants, 50);
  assert.equal(results.arms.control.completionRateString, '4/10 = 40.0%');
  assert.equal(results.arms.armA.completionRateString, '7/10 = 70.0%');
  assert.equal(results.arms.armB.completionRateString, '6/10 = 60.0%');
  assert.equal(results.arms.compositeCorrectArmAB.completionRateString, '9/10 = 90.0%');
  assert.equal(results.arms.compositeReversedArmBA.completionRateString, '6/10 = 60.0%');

  // Assert Replication Synergy
  assert.equal(results.replicationCompositionDelta, 0.2000); // 90% - max(70%, 60%) = +20.0%
  assert.equal(results.replicationCompositionDeltaPercentage, '+20.0%');
  assert.equal(results.replicationConfirmed, true);

  // Assert Order Dependency (A->B outperforming B->A by +30%)
  assert.equal(results.orderDependencyDelta, 0.3000); // 90% - 60% = +30.0%
  assert.equal(results.orderDependencyProven, true);
  assert.equal(results.verdict, 'COMPOSITION_REPLICATION_AND_ORDER_DEPENDENCY_PROVEN');
});

test('J001-03: Dynamic Adaptive Composition Selector selects strategy based on context', () => {
  const executor = new CanaryJ001CompositeReplicationExecutor();

  // Test standard dual requirement -> COMPOSE_A_THEN_B
  const choice1 = executor.evaluateAdaptiveComposition({
    domainType: 'WEB_FORM',
    isStreamingBinary: false,
    requiresSecretMasking: true,
    requiresLiveGuidance: true
  });
  assert.equal(choice1.selectedStrategy, 'COMPOSE_A_THEN_B');
  assert.equal(choice1.order, 'A_FIRST_THEN_B');

  // Test streaming binary violation -> DO_NOT_COMPOSE
  const choice2 = executor.evaluateAdaptiveComposition({
    domainType: 'STREAMING_SOCKET',
    isStreamingBinary: true,
    requiresSecretMasking: true,
    requiresLiveGuidance: true
  });
  assert.equal(choice2.selectedStrategy, 'DO_NOT_COMPOSE');
});

test('J001-04: Live Anti-Composition Guard enforces DO_NOT_COMPOSE on conflicting negative BKM', () => {
  const executor = new CanaryJ001CompositeReplicationExecutor();
  const guardCheck = executor.evaluateLiveAntiCompositionGuard();

  assert.equal(guardCheck.evaluationOutcome, 'DO_NOT_COMPOSE');
  assert.equal(guardCheck.guardActive, true);
  assert.equal(guardCheck.antiDogmatismProven, true);
});

test('J001-05: Live Kill-Switch Latency Benchmark (< 50ms) and Deterministic Rollback (Δ=0)', () => {
  const executor = new CanaryJ001CompositeReplicationExecutor();
  const killCheck = executor.verifyJ001KillSwitch();
  const rollbackCheck = executor.verifyJ001Rollback();

  assert.equal(killCheck.compliant, true);
  assert.ok(killCheck.latencyMs < 50);
  assert.equal(rollbackCheck.rollbackValid, true);
  assert.equal(rollbackCheck.unauthorizedDelta, 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { AutonomyGraduationEngine } from '../scripts/engine/autonomy-graduation-engine.js';

// ====================================================
// EOS AUTONOMY GRADUATION TESTS (AG-01..08)
// ====================================================

const engine = new AutonomyGraduationEngine();

test('AG-01: Evidence Completeness Review verifies all 5 packages are fully supported', () => {
  const res = engine.reviewEvidenceCompleteness();

  assert.equal(res.allPackagesComplete, true);
  assert.equal(res.evidencePackages.reliabilityBinomialStats.sampleSize, 200);
  assert.equal(res.verdict, 'EVIDENCE_COMPLETENESS_REVIEW_PASSED');
});

test('AG-02: Risk Classification Calibration enforces Default-Deny on unseen ambiguous actions', () => {
  const unseen = engine.calibrateRiskClassification({ actionType: 'UNSEEN_COMPLEX_MUTATION' });

  assert.equal(unseen.classifiedRisk, 'CRITICAL_RISK');
  assert.equal(unseen.mode, 'DEFAULT_DENY_HUMAN_ESCALATION');
  assert.equal(unseen.autonomousAllowed, false);
});

test('AG-05: Restricted-Production Canary deploys strictly onto isolated canary scope', () => {
  const res = engine.deployCanaryScope({ projectId: 'PRJ-CANARY-ALPHA', scope: 'READ_MOSTLY_ISOLATED' });

  assert.equal(res.canaryState.active, true);
  assert.equal(res.canaryState.projectId, 'PRJ-CANARY-ALPHA');
  assert.equal(res.canaryState.governanceBoundary, 'STRICTLY_ISOLATED_CANARY_ONLY');
});

test('AG-06: Emergency Kill-Switch halts execution deterministically in <50ms', () => {
  const res = engine.triggerEmergencyKillSwitch('SIMULATED_ALERT');

  assert.equal(res.killSwitchEngaged, true);
  assert.equal(res.allAutonomousOperationsHalted, true);
  assert.ok(res.shutdownDurationMs < 50);
  assert.equal(res.verdict, 'EMERGENCY_KILL_SWITCH_INSTANTLY_CONTAINED');
});

test('AG-07 & 08: GATE-13 graduates to Canary Restricted Scope while general production remains CLOSED', () => {
  const res = engine.evaluateAutonomyGraduationDecision();

  assert.equal(res.gate13Decision.gate13GraduationState, 'CANARY_RESTRICTED_SCOPE_AUTHORIZED');
  assert.equal(res.gate13Decision.generalProductionAutonomy, 'STRICTLY_CLOSED');
  assert.equal(res.gate13Decision.fundacionState, 'STRICTLY_FROZEN_GAP002_UNKNOWN');
  assert.equal(res.verdict, 'EOS_AUTONOMY_GRADUATION_001_CERTIFIED');
});
